import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, FileText } from 'lucide-react-native';
import { useTheme } from '@/src/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>History</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Search size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      <View style={styles.emptyState}>
        <View
          style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}
        >
          <FileText size={30} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No transcriptions yet
        </Text>
        <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
          Your saved recordings will appear here
        </Text>
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4, width: 36 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

