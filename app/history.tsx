import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText } from 'lucide-react-native';
import { useTheme } from '@/src/theme';

export default function HistoryScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
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

