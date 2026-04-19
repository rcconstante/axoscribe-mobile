import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Share,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { History, Settings, Mic, Square, Copy, Trash2, Share2, HardDrive } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/src/theme';
import { useHistoryDrawer } from '@/src/HistoryDrawer';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { initWhisper } from 'whisper.rn';
import type { WhisperContext } from 'whisper.rn';

// ── Model helpers ────────────────────────────────────────────────────────────────────
const MODEL_DIR = FileSystem.documentDirectory + 'models/';
// Prefer higher-quality models first
const MODEL_PREFERENCE = ['ggml-small.bin', 'ggml-base.bin', 'ggml-tiny.bin'];

async function getFirstDownloadedModelPath(): Promise<string | null> {
  for (const filename of MODEL_PREFERENCE) {
    try {
      const uri = MODEL_DIR + filename;
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        // whisper.rn needs a bare file path, not a file:// URI
        return uri.replace(/^file:\/\//, '');
      }
    } catch {}
  }
  return null;
}

// ── Types ────────────────────────────────────────────────────────────────────
type PermissionStatus = 'undetermined' | 'granted' | 'denied';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(total: number): string {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { openHistory } = useHistoryDrawer();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // State
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [hasModel, setHasModel] = useState<boolean | null>(null);
  const [modelLoading, setModelLoading] = useState(false);

  // Refs
  const whisperRef = useRef<WhisperContext | null>(null);
  const loadedModelPathRef = useRef<string | null>(null);
  const stopTranscribeRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute bottom clearance to sit above the tab bar
  const tabClearance =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 16) + 8 + 64 + 16
      : Math.max(insets.bottom, 8) + 10 + 64 + 16;

  // ── Model check + whisper init ──────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function initModelIfNeeded() {
        const path = await getFirstDownloadedModelPath();
        if (cancelled) return;

        if (!path) {
          setHasModel(false);
          return;
        }
        setHasModel(true);

        // Already have this model loaded — skip expensive re-init
        if (loadedModelPathRef.current === path) return;

        setModelLoading(true);
        try {
          if (whisperRef.current) {
            await whisperRef.current.release();
            whisperRef.current = null;
          }
          if (!cancelled) {
            whisperRef.current = await initWhisper({ filePath: path });
            loadedModelPathRef.current = path;
          }
        } catch {
          if (!cancelled) setHasModel(false);
        } finally {
          if (!cancelled) setModelLoading(false);
        }
      }

      initModelIfNeeded();

      const sub = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') initModelIfNeeded();
      });

      return () => {
        cancelled = true;
        sub.remove();
      };
    }, []),
  );

  // ── Permissions ────────────────────────────────────────────────────────────
  useEffect(() => {
    Audio.getPermissionsAsync().then(({ status }) => {
      setPermission(status as PermissionStatus);
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    setPermission(status as PermissionStatus);
    if (status !== 'granted') {
      Alert.alert(
        'Microphone Access Required',
        'To transcribe speech, AxoScribe needs access to your microphone. Please enable it in Settings.',
        [{ text: 'OK' }],
      );
      return false;
    }
    return true;
  }, []);

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    const granted =
      permission === 'granted' ? true : await requestPermission();
    if (!granted) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setTranscript('');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      Alert.alert(
        'Could Not Start Recording',
        'Please check that the microphone is not in use by another app.',
      );
    }
  }, [permission, requestPermission]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      // recordingRef.current.getURI() → pass to Whisper on-device transcription
      // Transcription output updates `setTranscript()` in real implementation
    } catch {
      // Recording may already be stopped; safe to ignore
    } finally {
      recordingRef.current = null;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleMicPress = useCallback(() => {
    if (!hasModel) {
      Alert.alert(
        'No Model Downloaded',
        'You need to download a Whisper AI model before recording. Go to the Models tab to download one.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Go to Models', onPress: () => router.push('/(tabs)/models') },
        ],
      );
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [hasModel, isRecording, stopRecording, startRecording, router]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!transcript) return;
    await Clipboard.setStringAsync(transcript);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShare = async () => {
    if (!transcript) return;
    try {
      await Share.share({ message: transcript, title: 'AxoScribe Transcription' });
    } catch {
      // User cancelled share
    }
  };

  const handleClear = () => {
    Alert.alert('Clear Transcription', 'Remove the current transcription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setTranscript('');
          setSeconds(0);
        },
      },
    ]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopTranscribeRef.current?.();
      whisperRef.current?.release().catch(() => {});
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.headerButton }]}
          onPress={openHistory}
          activeOpacity={0.7}
          accessibilityLabel="History"
          accessibilityRole="button"
        >
          <History size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text
          style={[styles.wordmark, { color: colors.text }]}
          accessibilityRole="header"
        >
          Axo<Text style={styles.wordmarkBold}>Scribe</Text>
        </Text>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.headerButton }]}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
          accessibilityLabel="Settings"
          accessibilityRole="button"
        >
          <Settings size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Mic Section ── */}
      <View style={styles.micSection}>
        <View
          style={[
            styles.outerRing,
            { borderColor: isRecording ? '#EF4444' : colors.border },
          ]}
        >
          <View
            style={[
              styles.innerRing,
              { borderColor: isRecording ? '#EF444466' : colors.surfaceVariant },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.micButton,
                {
                  backgroundColor:
                    isRecording
                      ? '#EF4444'
                      : !hasModel || modelLoading
                      ? colors.surfaceVariant
                      : colors.primary,
                  opacity: hasModel === null || modelLoading ? 0.6 : 1,
                },
              ]}
              onPress={handleMicPress}
              activeOpacity={0.82}
              disabled={hasModel === null || modelLoading}
              accessibilityLabel={
                modelLoading
                  ? 'Loading model'
                  : hasModel === false
                  ? 'Download a model to enable recording'
                  : isRecording
                  ? 'Stop recording'
                  : 'Start recording'
              }
              accessibilityRole="button"
            >
              {modelLoading ? (
                <ActivityIndicator color={colors.textMuted} />
              ) : isRecording ? (
                <Square size={28} color="#FFFFFF" fill="#FFFFFF" />
              ) : hasModel === false ? (
                <HardDrive size={30} color={colors.textMuted} />
              ) : (
                <Mic size={32} color={colors.primaryForeground} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isRecording ? (
          <View style={styles.recordingRow}>
            <View style={styles.recordingDot} />
            <Text style={[styles.recordingTime, { color: colors.text }]}>
              {formatTime(seconds)}
            </Text>
          </View>
        ) : modelLoading ? (
          <Text style={[styles.statusLabel, { color: colors.textMuted }]}>
            Loading model…
          </Text>
        ) : hasModel === false ? (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/models')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <Text style={[styles.statusLabel, { color: colors.primary, textDecorationLine: 'underline' }]}>
              Download a model to start
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.statusLabel, { color: colors.textMuted }]}>
            {transcript ? 'Tap mic to record again' : 'Tap to start transcribing'}
          </Text>
        )}
      </View>

      {/* ── Transcription Output Box ── */}
      <View style={[styles.outputContainer, { paddingBottom: tabClearance }]}>
        <View
          style={[
            styles.outputCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Card toolbar */}
          <View
            style={[styles.outputHeader, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.outputTitle, { color: colors.textSecondary }]}>
              Transcription
            </Text>
            {transcript.length > 0 && (
              <View style={styles.outputActions}>
                <TouchableOpacity
                  onPress={handleCopy}
                  activeOpacity={0.7}
                  style={styles.actionBtn}
                  accessibilityLabel="Copy transcription"
                >
                  <Copy size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  activeOpacity={0.7}
                  style={styles.actionBtn}
                  accessibilityLabel="Share transcription"
                >
                  <Share2 size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClear}
                  activeOpacity={0.7}
                  style={styles.actionBtn}
                  accessibilityLabel="Clear transcription"
                >
                  <Trash2 size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Body */}
          <ScrollView
            style={styles.outputBody}
            contentContainerStyle={styles.outputBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {transcript.length > 0 ? (
              <Text
                style={[styles.transcriptText, { color: colors.text }]}
                selectable
              >
                {transcript}
              </Text>
            ) : (
              <View style={styles.emptyOutput}>
                <Mic size={24} color={colors.border} />
                <Text style={[styles.emptyOutputText, { color: colors.textMuted }]}>
                  {isRecording ? 'Listening…' : 'Your transcription will appear here'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer stats */}
          <View
            style={[styles.outputFooter, { borderTopColor: colors.border }]}
          >
            <Text style={[styles.footerStat, { color: colors.textMuted }]}>
              {formatTime(seconds)}
            </Text>
            <Text style={[styles.footerStat, { color: colors.textMuted }]}>
              {wordCount(transcript)} words
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontSize: 18, fontWeight: '300', letterSpacing: 0.5 },
  wordmarkBold: { fontWeight: '800' },

  // Mic
  micSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  outerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  innerRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingTime: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statusLabel: { fontSize: 14 },

  // Output card
  outputContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  outputCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  outputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  outputTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  outputActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  outputBody: { flex: 1 },
  outputBodyContent: { padding: 16, flexGrow: 1 },
  transcriptText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '400',
  },
  emptyOutput: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 120,
  },
  emptyOutputText: { fontSize: 14, textAlign: 'center' },
  outputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerStat: {
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});


