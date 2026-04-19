import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, Trash2, History, Settings, CheckCircle2, HardDrive } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { useHistoryDrawer } from '@/src/HistoryDrawer';
import * as FileSystem from 'expo-file-system/legacy';

// ── Model definitions ─────────────────────────────────────────────────────────
// Replace these URLs with your CDN / self-hosted model files before shipping.
const MODELS = [
  {
    id: 'tiny',
    name: 'Whisper Tiny',
    size: '75 MB',
    bytes: 75_000_000,
    desc: 'Fastest · Good for quick notes',
    recommended: false,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    filename: 'ggml-tiny.bin',
  },
  {
    id: 'base',
    name: 'Whisper Base',
    size: '140 MB',
    bytes: 140_000_000,
    desc: 'Balanced speed & accuracy',
    recommended: false,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    filename: 'ggml-base.bin',
  },
  {
    id: 'small',
    name: 'Whisper Small',
    size: '244 MB',
    bytes: 244_000_000,
    desc: 'High accuracy · Recommended',
    recommended: true,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    filename: 'ggml-small.bin',
  },
];

type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

interface ModelStatus {
  state: DownloadState;
  progress: number; // 0–1
}

const modelDir = FileSystem.documentDirectory + 'models/';

async function ensureModelDir() {
  const info = await FileSystem.getInfoAsync(modelDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ModelsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { openHistory } = useHistoryDrawer();

  const tabClearance =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 16) + 8 + 64 + 20
      : Math.max(insets.bottom, 8) + 10 + 64 + 20;

  const [status, setStatus] = useState<Record<string, ModelStatus>>(() =>
    Object.fromEntries(MODELS.map((m) => [m.id, { state: 'idle', progress: 0 }])),
  );

  // Storage info
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);

  const refreshStorage = useCallback(async () => {
    try {
      const free = await FileSystem.getFreeDiskStorageAsync();
      setFreeBytes(free);
    } catch {}
    try {
      const total = await FileSystem.getTotalDiskCapacityAsync();
      if (total > 0) setTotalBytes(total);
    } catch {}
  }, []);

  useEffect(() => {
    refreshStorage();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshStorage();
    });
    return () => sub.remove();
  }, [refreshStorage]);

  const downloadResumablesRef = useRef<Record<string, FileSystem.DownloadResumable>>({});

  const handleDownload = useCallback(
    async (model: (typeof MODELS)[number]) => {
      const current = status[model.id];
      if (current.state === 'downloading') return; // already in progress

      try {
        await ensureModelDir();
        const dest = modelDir + model.filename;

        // Check if already downloaded
        const info = await FileSystem.getInfoAsync(dest);
        if (info.exists) {
          setStatus((s) => ({ ...s, [model.id]: { state: 'done', progress: 1 } }));
          return;
        }

        // Check free space (rough)
        const freeDiskInfo = await FileSystem.getFreeDiskStorageAsync();
        if (freeDiskInfo < model.bytes * 1.1) {
          Alert.alert(
            'Not Enough Space',
            `You need at least ${model.size} of free storage to download this model.`,
          );
          return;
        }

        setStatus((s) => ({ ...s, [model.id]: { state: 'downloading', progress: 0 } }));

        const resumable = FileSystem.createDownloadResumable(
          model.url,
          dest,
          { headers: { Accept: 'application/octet-stream', 'User-Agent': 'AxoScribe/1.0' } },
          (downloadProgress) => {
            const total = downloadProgress.totalBytesExpectedToWrite;
            const written = downloadProgress.totalBytesWritten;
            const ratio = total > 0 ? Math.min(written / total, 1) : 0;
            setStatus((s) => ({
              ...s,
              [model.id]: { state: 'downloading', progress: ratio },
            }));
          },
        );

        downloadResumablesRef.current[model.id] = resumable;
        await resumable.downloadAsync();

        // Verify the file actually landed on disk
        const saved = await FileSystem.getInfoAsync(dest);
        if (saved.exists) {
          setStatus((s) => ({ ...s, [model.id]: { state: 'done', progress: 1 } }));
          refreshStorage();
        } else {
          throw new Error('File not found after download');
        }
      } catch (e) {
        setStatus((s) => ({ ...s, [model.id]: { state: 'error', progress: 0 } }));
        Alert.alert(
          'Download Failed',
          'Could not download the model. Check your internet connection and try again.',
          [
            {
              text: 'Retry',
              onPress: () =>
                setStatus((s) => ({ ...s, [model.id]: { state: 'idle', progress: 0 } })),
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      }
    },
    [status, refreshStorage],
  );

  const handleDelete = useCallback(
    (model: (typeof MODELS)[number]) => {
      Alert.alert(
        `Delete ${model.name}?`,
        'You can re-download it any time.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await FileSystem.deleteAsync(modelDir + model.filename, { idempotent: true });
                setStatus((s) => ({
                  ...s,
                  [model.id]: { state: 'idle', progress: 0 },
                }));
                refreshStorage();
              } catch {
                Alert.alert('Error', 'Could not delete the model file.');
              }
            },
          },
        ],
      );
    },
    [refreshStorage],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.headerButton }]}
          onPress={openHistory}
          activeOpacity={0.7}
          accessibilityLabel="History"
        >
          <History size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Models</Text>

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
        contentContainerStyle={{ paddingBottom: tabClearance }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* ── Storage card ── */}
          {freeBytes !== null && (
            <View style={[styles.storageCard, { backgroundColor: colors.surface }]}>
              <View style={styles.storageRow}>
                <HardDrive size={16} color={colors.textSecondary} />
                <Text style={[styles.storageTitle, { color: colors.text }]}>Available Storage</Text>
                <Text style={[styles.storageValue, { color: colors.textMuted }]}>
                  {(freeBytes / 1e9).toFixed(1)} GB free
                </Text>
              </View>
              {totalBytes !== null && totalBytes > 0 && (
                <>
                  <View style={[styles.storageTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.storageFill,
                        {
                          backgroundColor:
                            freeBytes / totalBytes < 0.1 ? '#EF4444' : colors.primary,
                          width: `${Math.round((1 - freeBytes / totalBytes) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.storageNote, { color: colors.textMuted }]}>
                    {Math.round((1 - freeBytes / totalBytes) * 100)}% used
                    {'  ·  '}{(totalBytes / 1e9).toFixed(0)} GB total
                  </Text>
                </>
              )}
            </View>
          )}

          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
            Download once, transcribe forever — no internet needed.
          </Text>

          {MODELS.map((model) => {
            const ms = status[model.id];
            const isDownloading = ms.state === 'downloading';
            const isDone = ms.state === 'done';

            return (
              <View
                key={model.id}
                style={[
                  styles.modelCard,
                  { backgroundColor: colors.surface },
                  isDone && { borderWidth: 1, borderColor: colors.primary },
                ]}
              >
                {/* Model info */}
                <View style={styles.modelInfo}>
                  <View style={styles.modelNameRow}>
                    <Text style={[styles.modelName, { color: colors.text }]}>
                      {model.name}
                    </Text>
                    {model.recommended && (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text
                          style={[styles.badgeText, { color: colors.primaryForeground }]}
                        >
                          Recommended
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.modelDesc, { color: colors.textMuted }]}>
                    {model.desc}
                  </Text>
                  <Text style={[styles.modelSize, { color: colors.textSecondary }]}>
                    {model.size}
                    {isDownloading
                      ? `  ·  ${Math.round(ms.progress * 100)}%`
                      : isDone
                      ? '  ·  Ready'
                      : ''}
                  </Text>

                  {/* Progress bar */}
                  {isDownloading && (
                    <View
                      style={[styles.progressTrack, { backgroundColor: colors.border }]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${Math.round(ms.progress * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>

                {/* Action button */}
                {isDone ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}
                    activeOpacity={0.75}
                    onPress={() => handleDelete(model)}
                    accessibilityLabel={`Delete ${model.name}`}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: isDownloading
                          ? colors.surfaceVariant
                          : colors.primary,
                        opacity: isDownloading ? 0.6 : 1,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleDownload(model)}
                    disabled={isDownloading}
                    accessibilityLabel={
                      isDownloading ? `Downloading ${model.name}` : `Download ${model.name}`
                    }
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} color={colors.primaryForeground} />
                    ) : (
                      <Download
                        size={18}
                        color={isDownloading ? colors.textMuted : colors.primaryForeground}
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <Text style={[styles.footnote, { color: colors.textMuted }]}>
            Models are powered by OpenAI Whisper and run entirely on-device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
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
  content: { paddingHorizontal: 20, paddingTop: 8 },
  pageSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
  },
  modelInfo: { flex: 1, marginRight: 16 },
  modelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  modelName: { fontSize: 16, fontWeight: '600' },
  modelDesc: { fontSize: 13, marginBottom: 4, lineHeight: 18 },
  modelSize: { fontSize: 12, fontWeight: '500' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  footnote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  // Storage card
  storageCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  storageTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  storageValue: { fontSize: 13, fontWeight: '500' },
  storageTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  storageFill: {
    height: 6,
    borderRadius: 3,
  },
  storageNote: { fontSize: 11 },
});

