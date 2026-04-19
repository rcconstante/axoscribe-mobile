import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { UploadCloud, FileAudio, History, Settings, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { useHistoryDrawer } from '@/src/HistoryDrawer';
import * as DocumentPicker from 'expo-document-picker';

interface PickedFile {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
}

export default function UploadScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { openHistory } = useHistoryDrawer();
  const [files, setFiles] = useState<PickedFile[]>([]);

  const tabClearance = Platform.OS === 'android'
    ? Math.max(insets.bottom, 16) + 8 + 64 + 20
    : Math.max(insets.bottom, 8) + 10 + 64 + 20;

  const handlePick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;
      const picked: PickedFile[] = result.assets.map((a) => ({
        name: a.name,
        uri: a.uri,
        size: a.size,
        mimeType: a.mimeType,
      }));
      setFiles((prev) => [...prev, ...picked]);
    } catch {
      Alert.alert('Error', 'Could not open file picker. Please try again.');
    }
  }, []);

  const handleRemove = useCallback((uri: string) => {
    Alert.alert('Remove file?', 'Remove this file from the list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setFiles((prev) => prev.filter((f) => f.uri !== uri)),
      },
    ]);
  }, []);

  function formatBytes(bytes?: number) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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
        >
          <History size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Upload</Text>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.headerButton }]}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Settings size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { paddingBottom: tabClearance }]}>
        <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
          Transcribe any audio or video file — fully offline.
        </Text>

        <TouchableOpacity
          style={[
            styles.uploadArea,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.75}
          onPress={handlePick}
          accessibilityLabel="Browse files for transcription"
          accessibilityRole="button"
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceVariant }]}>
            <UploadCloud size={34} color={colors.primary} />
          </View>
          <Text style={[styles.uploadText, { color: colors.text }]}>
            Tap to browse files
          </Text>
          <Text style={[styles.uploadSubText, { color: colors.textMuted }]}>
            .mp4 · .mp3 · .wav · .m4a
          </Text>
        </TouchableOpacity>

        {/* File list or empty state */}
        {files.length === 0 ? (
          <View style={styles.emptyState}>
            <FileAudio size={44} color={colors.border} style={{ marginBottom: 14 }} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No uploads yet
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
              Uploaded files will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={files}
            keyExtractor={(item) => item.uri}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.fileRow, { backgroundColor: colors.surface }]}>
                <FileAudio size={20} color={colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.fileName, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {item.name}
                  </Text>
                  {!!item.size && (
                    <Text style={[styles.fileSize, { color: colors.textMuted }]}>
                      {formatBytes(item.size)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleRemove(item.uri)}
                  style={[styles.removeBtn, { backgroundColor: colors.surfaceVariant }]}
                  accessibilityLabel={`Remove ${item.name}`}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

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
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  pageSubtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  uploadArea: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingVertical: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    gap: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadText: { fontSize: 17, fontWeight: '600' },
  uploadSubText: { fontSize: 13 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubText: { fontSize: 14 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  fileName: { fontSize: 14, fontWeight: '500' },
  fileSize: { fontSize: 12, marginTop: 2 },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

