import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountPanel } from '@/components/auth/account-panel';
import { HamburgerButton } from '@/components/navigation/hamburger-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WhyBuyCard } from '@/components/tours/why-buy-card';
import { GoldBorderView } from '@/components/ui/gold-border-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { GoldGradientHorizontal } from '@/theme/gradients';

function SubscriptionCard({
  delay,
  onPress,
}: {
  delay: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useStrings();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(440).springify().damping(18)}
      style={styles.cardWrap}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.subShadow,
          {
            backgroundColor: theme.backgroundElement,
            shadowColor: theme.primary,
          },
          pressed ? styles.subPressed : null,
        ]}
      >
        <GoldBorderView
          borderRadius={Spacing.four}
          borderWidth={1.5}
          innerBackground={theme.backgroundElement}
        >
          <View style={styles.subInner}>
            <LinearGradient
              {...GoldGradientHorizontal}
              style={styles.subIconChip}
            >
              <Ionicons name="star" size={24} color="#1a1208" />
            </LinearGradient>

            <View style={styles.subText}>
              <ThemedText type="smallBold" style={styles.subTitle}>
                {t('subscribe.accountCta')}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.subHint}
              >
                {t('subscribe.accountCtaHint')}
              </ThemedText>
            </View>

            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
          </View>
        </GoldBorderView>
      </Pressable>
    </Animated.View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useStrings();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          <View style={styles.topBar}>
            <HamburgerButton />
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              style={styles.brandTitle}
            >
              {t('account.title')}
            </ThemedText>
          </View>

          <SubscriptionCard
            delay={90}
            onPress={() => router.push('/subscribe')}
          />
          <Animated.View
            entering={FadeInDown.delay(20)
              .duration(420)
              .springify()
              .damping(18)}
            style={styles.cardWrap}
          >
            <AccountPanel />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(150)
              .duration(420)
              .springify()
              .damping(18)}
            style={styles.cardWrap}
          >
            <WhyBuyCard />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingTop: Spacing.two,
  },
  brandTitle: {
    fontSize: 18,
    lineHeight: 24,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: Spacing.three,
  },
  cardWrap: {
    alignSelf: 'stretch',
  },
  subShadow: {
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.32,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  subPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  subInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  subIconChip: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subText: {
    flex: 1,
    gap: 2,
  },
  subTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  subHint: {
    lineHeight: 18,
  },
});
