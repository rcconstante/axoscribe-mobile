import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Languages,
  Info,
  Shield,
  FileText,
  ExternalLink,
  Check,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = '@axoscribe_language';
const AUTOSAVE_KEY = '@axoscribe_autosave';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'id', name: 'Indonesian' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleDark } = useTheme();
  const [selectedLang, setSelectedLang] = useState('en');
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  // Load persisted preferences on mount
  useEffect(() => {
    AsyncStorage.multiGet([LANG_KEY, AUTOSAVE_KEY]).then((pairs) => {
      const lang = pairs[0][1];
      const save = pairs[1][1];
      if (lang) setSelectedLang(lang);
      if (save !== null) setAutoSave(save === 'true');
    }).catch(() => {});
  }, []);

  const handleLangSelect = useCallback((code: string) => {
    setSelectedLang(code);
    AsyncStorage.setItem(LANG_KEY, code).catch(() => {});
  }, []);

  const handleAutoSaveToggle = useCallback((value: boolean) => {
    setAutoSave(value);
    AsyncStorage.setItem(AUTOSAVE_KEY, String(value)).catch(() => {});
  }, []);

  const currentLangName =
    LANGUAGES.find((l) => l.code === selectedLang)?.name ?? 'English';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Preferences ── */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
          Preferences
        </Text>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          {/* Dark Mode */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Moon size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? colors.primaryForeground : colors.surface}
              ios_backgroundColor={colors.border}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Language */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => setLangModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Languages size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Transcription Language
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.textMuted }]}>
                {currentLangName}
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Auto-save */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Bell size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Auto-save Transcriptions
              </Text>
            </View>
            <Switch
              value={autoSave}
              onValueChange={handleAutoSaveToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>

        {/* ── Legal ── */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
          Legal
        </Text>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://axoscribe.app/privacy')}
          >
            <View style={styles.rowLeft}>
              <Shield size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Privacy Policy
              </Text>
            </View>
            <ExternalLink size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://axoscribe.app/terms')}
          >
            <View style={styles.rowLeft}>
              <FileText size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Terms of Service
              </Text>
            </View>
            <ExternalLink size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
          About
        </Text>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Info size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                AxoScribe
              </Text>
            </View>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>
              1.0.2
            </Text>
          </View>
        </View>

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          All transcriptions run 100 % on-device.{'\n'}
          No audio data ever leaves your phone.
        </Text>

        {/* ── Credits ── */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
          Credits
        </Text>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Info size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Created by Richmond Constante
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://rcconstante.dev')}
          >
            <View style={styles.rowLeft}>
              <ExternalLink size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Portfolio
              </Text>
            </View>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>
              rcconstante.dev
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://github.com/rcconstante')}
          >
            <View style={styles.rowLeft}>
              <ExternalLink size={18} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                GitHub
              </Text>
            </View>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>
              @rcconstante
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Language Picker Modal ── */}
      <Modal
        visible={langModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          edges={['top', 'bottom']}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Language
            </Text>
            <TouchableOpacity
              onPress={() => setLangModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalDone, { color: colors.primary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            renderItem={({ item }) => {
              const isSelected = item.code === selectedLang;
              return (
                <TouchableOpacity
                  style={[
                    styles.langRow,
                    { backgroundColor: isSelected ? colors.surfaceVariant : 'transparent' },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleLangSelect(item.code)}
                >
                  <Text
                    style={[
                      styles.langText,
                      { color: colors.text, fontWeight: isSelected ? '600' : '400' },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isSelected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
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
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 60 },

  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  group: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowText: { fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },

  footerNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 20,
  },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalDone: { fontSize: 16, fontWeight: '600' },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  langText: { fontSize: 16 },
});

