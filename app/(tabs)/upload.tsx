import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  Share,
  NativeModules,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  UploadCloud,
  FileAudio,
  History,
  Settings,
  Copy,
  Share2,
  RotateCcw,
  CheckCircle,
  Play,
  Pause,
  HardDrive,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { useHistoryDrawer } from '@/src/HistoryDrawer';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveEntry, makeTitle } from '@/src/historyStorage';
import type { WhisperContext } from 'whisper.rn';

// ── Whisper native module detection (same pattern as home screen) ─────────────
type InitWhisperFn = typeof import('whisper.rn')['initWhisper'];
const WHISPER_AVAILABLE = !!NativeModules.RNWhisper;
let initWhisper: InitWhisperFn | null = null;
if (WHISPER_AVAILABLE) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    initWhisper = require('whisper.rn').initWhisper as InitWhisperFn;
  } catch {
    initWhisper = null;
  }
}

// ── Model helpers ─────────────────────────────────────────────────────────────
const MODEL_DIR = FileSystem.documentDirectory + 'models/';
const MODEL_PREFERENCE = ['ggml-small.bin', 'ggml-base.bin', 'ggml-tiny.bin'];
const LANG_KEY = '@axoscribe_language';

async function getFirstDownloadedModelPath(): Promise<string | null> {
  for (const filename of MODEL_PREFERENCE) {
    try {
      const uri = MODEL_DIR + filename;
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) return uri.replace(/^file:\/\//, '');
    } catch {}
  }
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type UploadState = 'idle' | 'transcribing' | 'done' | 'error';

interface PickedFile {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function UploadScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { openHistory } = useHistoryDrawer();

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLang, setSelectedLang] = useState('auto');

  const whisperRef = useRef<WhisperContext | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const tabClearance =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 16) + 8 + 64 + 20
      : Math.max(insets.bottom, 8) + 10 + 64 + 20;

  // Load language preference
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((val) => setSelectedLang(val ?? 'auto'))
      .catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      whisperRef.current?.release().catch(() => {});
    };
  }, []);

  // ── Pick file ──────────────────────────────────────────────────────────────
  const handlePick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      // Reset any previous transcription when a new file is picked
      await soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setIsPlaying(false);
      setFile({ name: asset.name, uri: asset.uri, size: asset.size, mimeType: asset.mimeType });
      setUploadState('idle');
      setTranscript('');
      setErrorMsg('');
    } catch {
      Alert.alert('Error', 'Could not open file picker. Please try again.');
    }
  }, []);

  // ── Transcribe ─────────────────────────────────────────────────────────────
  const handleTranscribe = useCallback(async () => {
    if (!file) return;

    if (!WHISPER_AVAILABLE) {
      Alert.alert(
        'Production Build Required',
        'Whisper AI needs a production build to run. It cannot run in Expo Go.',
      );
      return;
    }

    const modelPath = await getFirstDownloadedModelPath();
    if (!modelPath) {
      Alert.alert(
        'No Model Downloaded',
        'Download a Whisper AI model from the Models tab first.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Go to Models', onPress: () => router.push('/(tabs)/models') },
        ],
      );
      return;
    }

    setUploadState('transcribing');
    setErrorMsg('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Reuse existing whisper context or init fresh
      if (!whisperRef.current) {
        whisperRef.current = await initWhisper!({ filePath: modelPath });
      }

      // whisper.rn needs a bare file path (no file:// prefix)
      const filePath = file.uri.replace(/^file:\/\//, '');

      const { result } = await whisperRef.current.transcribe(filePath, {
        language: selectedLang === 'auto' ? undefined : selectedLang,
      });

      const cleaned = (result ?? '').replace(/\[BLANK_AUDIO\]/gi, '').trim();
      setTranscript(cleaned);
      setUploadState('done');

      // Auto-save to history
      if (cleaned) {
        const entry = {
          id: Date.now().toString(),
          title: makeTitle(cleaned),
          text: cleaned,
          date: new Date().toISOString(),
          wordCount: wordCount(cleaned),
          durationSeconds: 0,
        };
        saveEntry(entry).catch(() => {});
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setUploadState('error');
      setErrorMsg(
        'Transcription failed. Make sure the file is a valid audio or video file and try again.',
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [file, router, selectedLang]);

  // ── Playback ───────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(async () => {
    if (!file) return;
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            // If the track ended, restart from the beginning
            if (status.positionMillis >= (status.durationMillis ?? 0) - 200) {
              await soundRef.current.replayAsync();
            } else {
              await soundRef.current.playAsync();
            }
            setIsPlaying(true);
          }
          return;
        }
      }
      // Load and play for the first time
      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        },
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch {
      Alert.alert('Playback Error', 'Could not play this file.');
    }
  }, [file]);

  // ── Reset / Transcribe another ────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setIsPlaying(false);
    setFile(null);
    setTranscript('');
    setErrorMsg('');
    setUploadState('idle');
  }, []);

  // ── Copy / Share ───────────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!transcript) return;
    await Clipboard.setStringAsync(transcript);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShare = async () => {
    if (!transcript) return;
    try {
      await Share.share({ message: transcript, title: 'AxoScribe Transcription' });
    } catch {}
  };

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
        >
          <History size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Upload</Text>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.headerButton }]}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
          accessibilityLabel="Settings"
        >
          <Settings size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabClearance }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Upload / file picker zone ── */}
        {uploadState !== 'done' && (
          <TouchableOpacity
            style={[
              styles.uploadArea,
              {
                backgroundColor: colors.surface,
                borderColor: file ? colors.primary : colors.border,
              },
              uploadState === 'transcribing' && { opacity: 0.45 },
            ]}
            activeOpacity={0.75}
            onPress={uploadState === 'transcribing' ? undefined : handlePick}
            disabled={uploadState === 'transcribing'}
            accessibilityRole="button"
            accessibilityLabel={file ? `${file.name} — tap to change` : 'Browse files'}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceVariant }]}>
              {file ? (
                <FileAudio size={34} color={colors.primary} />
              ) : (
                <UploadCloud size={34} color={colors.primary} />
              )}
            </View>
            <Text style={[styles.uploadText, { color: colors.text }]}>
              {file ? file.name : 'Tap to browse files'}
            </Text>
            <Text style={[styles.uploadSubText, { color: colors.textMuted }]}>
              {file ? formatBytes(file.size) : '.mp4  ·  .mp3  ·  .wav  ·  .m4a'}
            </Text>
            {file && uploadState === 'idle' && (
              <Text style={[styles.changeTap, { color: colors.primary }]}>
                Tap to change file
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* ── Done: file name row with play / pause ── */}
        {uploadState === 'done' && file && (
          <View style={[styles.doneFileRow, { backgroundColor: colors.surface }]}>
            <View style={[styles.doneIconCircle, { backgroundColor: colors.surfaceVariant }]}>
              <CheckCircle size={20} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.doneFileName, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {file.name}
              </Text>
              <Text style={[styles.doneFileSize, { color: colors.textMuted }]}>
                {formatBytes(file.size)}  ·  Transcribed
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: colors.surfaceVariant }]}
              onPress={handlePlayPause}
              activeOpacity={0.7}
              accessibilityLabel={isPlaying ? 'Pause playback' : 'Play file'}
            >
              {isPlaying ? (
                <Pause size={18} color={colors.primary} />
              ) : (
                <Play size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Transcribing loading state ── */}
        {uploadState === 'transcribing' && (
          <View
            style={[
              styles.transcribingBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 20 }} />
            <Text style={[styles.transcribingTitle, { color: colors.text }]}>
              Transcribing…
            </Text>
            <Text style={[styles.transcribingSubText, { color: colors.textMuted }]}>
              Running Whisper AI on-device.{'\n'}This may take a moment.
            </Text>
          </View>
        )}

        {/* ── Error state ── */}
        {uploadState === 'error' && (
          <View style={[styles.errorBox, { borderColor: '#EF4444' }]}>
            <Text style={[styles.errorTitle, { color: '#EF4444' }]}>Transcription Failed</Text>
            <Text style={[styles.errorMsg, { color: colors.textMuted }]}>{errorMsg}</Text>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleTranscribe}
              activeOpacity={0.85}
            >
              <RotateCcw size={16} color={colors.primaryForeground} />
              <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Transcription output box ── */}
        {uploadState === 'done' && (
          <View
            style={[
              styles.outputCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Toolbar */}
            <View style={[styles.outputHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.outputTitle, { color: colors.textSecondary }]}>
                Transcription
              </Text>
              <View style={styles.outputActions}>
                <TouchableOpacity
                  onPress={handleCopy}
                  style={styles.actionBtn}
                  accessibilityLabel="Copy transcription"
                >
                  <Copy size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.actionBtn}
                  accessibilityLabel="Share transcription"
                >
                  <Share2 size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Text body */}
            <ScrollView
              style={styles.outputScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.transcriptText, { color: colors.text }]}>
                {transcript || 'No speech detected in this file.'}
              </Text>
            </ScrollView>

            {/* Footer stats */}
            <View style={[styles.outputFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.footerStat, { color: colors.textMuted }]}>
                {wordCount(transcript)} words
              </Text>
              <Text style={[styles.footerStat, { color: '#22C55E' }]}>✓ Saved to History</Text>
            </View>
          </View>
        )}

        {/* ── Primary action: Start Transcribing ── */}
        {uploadState === 'idle' && file && (
          <TouchableOpacity
            style={[styles.transcribeBtn, { backgroundColor: colors.primary }]}
            onPress={handleTranscribe}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {WHISPER_AVAILABLE ? (
              <FileAudio size={20} color={colors.primaryForeground} />
            ) : (
              <HardDrive size={20} color={colors.primaryForeground} />
            )}
            <Text style={[styles.transcribeBtnText, { color: colors.primaryForeground }]}>
              Start Transcribing
            </Text>
          </TouchableOpacity>
        )}

        {/* ── "Transcribe Another File" button ── */}
        {uploadState === 'done' && (
          <TouchableOpacity
            style={[
              styles.resetBtn,
              { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
            ]}
            onPress={handleReset}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <RotateCcw size={18} color={colors.text} />
            <Text style={[styles.resetBtnText, { color: colors.text }]}>
              Transcribe Another File
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Empty state (no file, idle) ── */}
        {uploadState === 'idle' && !file && (
          <View style={styles.emptyState}>
            <FileAudio size={44} color={colors.border} style={{ marginBottom: 14 }} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              Pick an audio or video file
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
              Transcription runs 100% on-device.{'\n'}No data ever leaves your phone.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTitle: { fontSize: 18, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8, flexGrow: 1 },

  // Upload zone
  uploadArea: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadText: { fontSize: 17, fontWeight: '600' },
  uploadSubText: { fontSize: 13 },
  changeTap: { fontSize: 13, marginTop: 2 },

  // Done: file row
  doneFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  doneIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doneFileName: { fontSize: 14, fontWeight: '500' },
  doneFileSize: { fontSize: 12, marginTop: 2 },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Transcribing
  transcribingBox: {
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 52,
    alignItems: 'center',
    marginBottom: 20,
  },
  transcribingTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  transcribingSubText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Error
  errorBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#EF444415',
  },
  errorTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  errorMsg: { fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionButtonText: { fontSize: 15, fontWeight: '600' },

  // Output card
  outputCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  outputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  outputTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outputActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8 },
  outputScroll: {
    minHeight: 140,
    maxHeight: 320,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  transcriptText: { fontSize: 16, lineHeight: 26 },
  outputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerStat: { fontSize: 12 },

  // CTA buttons
  transcribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 20,
    marginBottom: 16,
  },
  transcribeBtnText: { fontSize: 17, fontWeight: '700' },

  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  resetBtnText: { fontSize: 16, fontWeight: '600' },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

