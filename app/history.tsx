import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Copy, Share2, Trash2, FileText } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/theme';
import {
  loadHistory,
  deleteEntry,
  formatEntryDate,
  formatEntryTime,
  formatDuration,
  TranscriptionEntry,
} from '@/src/historyStorage';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [entry, setEntry] = useState<TranscriptionEntry | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setEntry(null);
      return;
    }
    loadHistory().then((items) => {
      setEntry(items.find((e) => e.id === id) ?? null);
    }).catch(() => setEntry(null));
  }, [id]);

  const handleCopy = async () => {
    if (!entry) return;
    await Clipboard.setStringAsync(entry.text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShare = async () => {
    if (!entry) return;
    try {
      await Share.share({ message: entry.text, title: entry.title });
    } catch {}
  };

  const handleDelete = () => {
    if (!entry) return;
    Alert.alert(
      'Delete Transcription',
      'Remove this transcription permanently? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(entry.id);
            router.back();
          },
        },
      ],
    );
  };

  // Loading state
  if (entry === undefined) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']} />
    );
  }

  // Not found
  if (entry === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}>
            <FileText size={28} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Not found</Text>
          <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
            This transcription no longer exists.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={handleCopy}
            activeOpacity={0.7}
            style={[styles.actionBtn, { backgroundColor: colors.headerButton }]}
            accessibilityLabel="Copy"
          >
            <Copy size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.7}
            style={[styles.actionBtn, { backgroundColor: colors.headerButton }]}
            accessibilityLabel="Share"
          >
            <Share2 size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.7}
            style={[styles.actionBtn, { backgroundColor: colors.headerButton }]}
            accessibilityLabel="Delete"
          >
            <Trash2 size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.title}</Text>

        {/* Meta row */}
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {formatEntryDate(entry.date)} · {formatEntryTime(entry.date)}
          {entry.wordCount > 0 ? ` · ${entry.wordCount} words` : ''}
          {entry.durationSeconds > 0 ? ` · ${formatDuration(entry.durationSeconds)}` : ''}
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Full transcript */}
        <Text style={[styles.transcript, { color: colors.text }]} selectable>
          {entry.text}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
  topActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  entryTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  transcript: {
    fontSize: 17,
    lineHeight: 28,
    letterSpacing: 0.15,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

