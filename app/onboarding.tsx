import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  type ViewToken,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Shield, Cpu } from 'lucide-react-native';
import { useTheme } from '@/src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PAGES = [
  {
    id: '1',
    icon: Mic,
    title: 'Voice to Text,\nInstantly',
    description:
      'Record or upload audio and get accurate transcriptions in seconds. Copy, share, or save your text with one tap.',
  },
  {
    id: '2',
    icon: Shield,
    title: '100% Private\n& Offline',
    description:
      'All processing happens on your device. Your audio and transcriptions never leave your phone — no internet needed.',
  },
  {
    id: '3',
    icon: Cpu,
    title: 'Powered by\nWhisper AI',
    description:
      'Download lightweight AI models once, then transcribe anywhere — on a plane, in a meeting, or off the grid.',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLastPage = currentIndex === PAGES.length - 1;

  const handleNext = () => {
    if (isLastPage) {
      onComplete();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const renderPage = ({ item }: { item: (typeof PAGES)[number] }) => {
    let source;
    if (item.id === '1') {
      source = require('@/assets/images/axolotl.png');
    } else if (item.id === '2') {
      source = require('@/assets/images/axolotl_private.png');
    } else {
      source = require('@/assets/images/axolotl_whisper.png');
    }

    return (
      <View style={[styles.page, { width: SCREEN_WIDTH }]}>
        <Image 
          source={source}
          style={{ width: 220, height: 220, marginBottom: 40, borderRadius: 32 }}
          resizeMode="contain"
        />

        <Text style={[styles.pageTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Skip */}
      <View style={styles.topBar}>
        {!isLastPage ? (
          <TouchableOpacity onPress={onComplete} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>
              Skip
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      {/* Pages */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? colors.primary : colors.border,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
            {isLastPage ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: { fontSize: 15, fontWeight: '500' },

  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 20,
  },
  pageDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },

  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
