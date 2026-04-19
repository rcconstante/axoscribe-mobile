import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, FileText } from 'lucide-react-native';
import { useTheme } from './theme';

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

  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openHistory = useCallback(() => {
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

          {/* Search bar (static for now) */}
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceVariant }]}>
            <Search size={15} color={colors.textMuted} />
            <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
              Search transcriptions…
            </Text>
          </View>

          {/* Empty state */}
          <View style={styles.emptyState}>
            <View
              style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}
            >
              <FileText size={28} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No transcriptions yet
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
              Your saved recordings will appear here
            </Text>
          </View>
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
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchPlaceholder: { fontSize: 14 },
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
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
