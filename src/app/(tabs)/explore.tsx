import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { AccountPanel } from '@/components/auth/account-panel';
import { HamburgerButton } from '@/components/navigation/hamburger-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WhyBuyCard } from '@/components/tours/why-buy-card';
import { GlassCard } from '@/components/ui/glass-card';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppContent } from '@/hooks/queries/use-app-content';
import { useEntitlementStatus } from '@/hooks/use-entitlement-status';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import {
  getCurrentTimeOfDay,
  resolveAppBackgroundUrl,
} from '@/lib/app-content/resolve-asset';
import { queryKeys } from '@/lib/query/keys';
import { subscriptionsService } from '@/services/subscriptions.service';
import { useRemoteConfig } from '@/store/release-config-store';
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
      entering={FadeInDown.delay(Math.min(delay, 80)).duration(260)}
      style={styles.cardWrap}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [pressed ? styles.subPressed : null]}
      >
        <GlassCard
          style={[styles.subCard, { borderColor: theme.primary }]}
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
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useStrings();
  const { hasActivePlan } = useEntitlementStatus();
  const { data: appContent } = useAppContent();
  const { venueTimezone } = useRemoteConfig();
  const backgroundUrl = resolveAppBackgroundUrl(
    appContent?.data.assets,
    getCurrentTimeOfDay(venueTimezone),
  );
  const heroOnDark = Boolean(backgroundUrl);

  useEffect(() => {
    if (hasActivePlan) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.config,
      queryFn: () => subscriptionsService.getConfig(),
    });
    router.prefetch('/subscribe');
  }, [hasActivePlan, queryClient, router]);

  const openSubscribe = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.config,
      queryFn: () => subscriptionsService.getConfig(),
    });
    router.push('/subscribe');
  }, [queryClient, router]);

  return (
    <ThemedView transparent style={styles.container}>
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
              style={[styles.brandTitle, heroOnDark && styles.onDarkText]}
            >
              {t('account.title')}
            </ThemedText>
          </View>

          {/* Nothing to sell to someone who already has an active plan. */}
          {!hasActivePlan ? (
            <SubscriptionCard delay={90} onPress={openSubscribe} />
          ) : null}
          <Animated.View
            entering={FadeInDown.delay(20).duration(260)}
            style={styles.cardWrap}
          >
            <AccountPanel />
          </Animated.View>

          {!hasActivePlan ? (
            <Animated.View
              entering={FadeInDown.delay(120).duration(260)}
              style={styles.cardWrap}
            >
              <WhyBuyCard />
            </Animated.View>
          ) : null}
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
  onDarkText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardWrap: {
    alignSelf: 'stretch',
  },
  subCard: {
    borderRadius: Spacing.four,
    borderWidth: 1.5,
    padding: 0,
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
