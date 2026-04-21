import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Modal,
  Dimensions,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, FileText, Clock, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from './theme';
import {
  loadHistory,
  TranscriptionEntry,
  formatEntryDate,
  formatEntryTime,
} from './historyStorage';

const DRAWER_WIDTH = Math.round(Dimensions.get('window').width * 0.82);

// ── Context ───────────────────────────────────────────────────────────────────
interface HistoryDrawerContextType {
  openHistory: () => void;
  closeHistory: () => void;
}

const HistoryDrawerContext = createContext<HistoryDrawerContextType>({
  openHistory: () => {},
  closeHistory: () => {},
});

export function useHistoryDrawer() {
  return useContext(HistoryDrawerContext);
}

// ── Provider + Drawer UI ──────────────────────────────────────────────────────
export function HistoryDrawerProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<TranscriptionEntry[]>([]);
  const [query, setQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Reload history whenever drawer opens
  useEffect(() => {
    if (visible) {
      loadHistory().then(setItems).catch(() => {});
    }
  }, [visible]);

  const openHistory = useCallback(() => {
    setQuery('');
    setVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const closeHistory = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 210,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 210,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [slideAnim, backdropAnim]);

  const handleItemPress = useCallback(
    (item: TranscriptionEntry) => {
      closeHistory();
      // Small delay so drawer finishes closing before navigating
      setTimeout(() => {
        router.push({ pathname: '/history', params: { id: item.id } });
      }, 220);
    },
    [closeHistory, router],
  );

  const filtered =
    query.trim().length > 0
      ? items.filter(
          (i) =>
            i.title.toLowerCase().includes(query.toLowerCase()) ||
            i.text.toLowerCase().includes(query.toLowerCase()),
        )
      : items;

  const paddingTop = insets.top + (Platform.OS === 'android' ? 12 : 8);
  const paddingBottom = Math.max(insets.bottom, 16);

  return (
    <HistoryDrawerContext.Provider value={{ openHistory, closeHistory }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeHistory}
      >
        {/* Backdrop — tap to close */}
        <TouchableWithoutFeedback onPress={closeHistory} accessibilityLabel="Close history">
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        {/* Drawer panel */}
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.surface,
              paddingTop,
              paddingBottom,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header row */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>History</Text>
            <TouchableOpacity
              onPress={closeHistory}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
              accessibilityLabel="Close history drawer"
              accessibilityRole="button"
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceVariant }]}>
            <Search size={15} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search transcriptions…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={13} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* List or empty state */}
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}>
                <FileText size={28} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {query.length > 0 ? 'No results' : 'No transcriptions yet'}
              </Text>
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                {query.length > 0
                  ? 'Try a different search term'
                  : 'Your saved recordings will appear here'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, { borderBottomColor: colors.border }]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.6}
                >
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.itemMeta}>
                      <Clock size={11} color={colors.textMuted} />
                      <Text style={[styles.itemMetaText, { color: colors.textMuted }]}>
                        {formatEntryDate(item.date)} · {formatEntryTime(item.date)}
                      </Text>
                    </View>
                    <Text style={[styles.itemPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.text}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </Animated.View>
      </Modal>
    </HistoryDrawerContext.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '700' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptySubText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  listContent: { paddingBottom: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemMetaText: { fontSize: 11, lineHeight: 14 },
  itemPreview: { fontSize: 13, lineHeight: 18 },
});
