import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useStripe } from '@stripe/stripe-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { CheckoutAuthSheet } from '@/components/subscribe/checkout-auth-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/ui/glass-card';
import { COLOSSEUM_TOUR_ID } from '@/constants/tours';
import { Spacing } from '@/constants/theme';
import { useCheckout } from '@/hooks/mutations/use-checkout';
import { useAppContent } from '@/hooks/queries/use-app-content';
import { useSubscriptionConfig } from '@/hooks/queries/use-subscription-config';
import { usePurchaseStatus } from '@/hooks/queries/use-purchase-status';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { refreshEntitlements } from '@/lib/entitlements/refresh';
import {
  getCurrentTimeOfDay,
  resolveAppBackgroundUrl,
} from '@/lib/app-content/resolve-asset';
import { computeSubscriptionPrice } from '@/lib/subscription-pricing';
import { useAuthStore } from '@/store/auth-store';
import { useRemoteConfig } from '@/store/release-config-store';

type Phase = 'form' | 'processing' | 'finalizing';

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount);
}

export default function SubscribeScreen() {
  const { t } = useStrings();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { data: appContent } = useAppContent();
  const { venueTimezone } = useRemoteConfig();
  const backgroundUrl = resolveAppBackgroundUrl(
    appContent?.data.assets,
    getCurrentTimeOfDay(venueTimezone),
  );
  const heroOnDark = Boolean(backgroundUrl);

  const {
    data: configResponse,
    isLoading: configLoading,
    isError: configError,
  } = useSubscriptionConfig();
  const checkout = useCheckout();

  const config = configResponse?.data;

  const [selectedPlanIdOverride, setSelectedPlanIdOverride] = useState<
    string | null
  >(null);
  const selectedPlanId = selectedPlanIdOverride ?? config?.plans[0]?.id ?? null;

  const [deviceCount, setDeviceCount] = useState(1);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutAuthVisible, setCheckoutAuthVisible] = useState(false);

  const { data: purchaseStatusResponse } = usePurchaseStatus(
    phase === 'finalizing' ? purchaseId : null,
  );
  const purchaseStatus = purchaseStatusResponse?.data.status;
  const isPaid = phase === 'finalizing' && purchaseStatus === 'PAID';
  const isPurchaseFailed =
    phase === 'finalizing' &&
    (purchaseStatus === 'FAILED' || purchaseStatus === 'CANCELLED');

  useEffect(() => {
    if (purchaseStatus === 'PAID') {
      // A purchase changes the access window, so refresh the snapshot outright —
      // invalidation would not refetch it (the query stays disabled while a valid
      // snapshot exists).
      void refreshEntitlements(queryClient).catch(() => undefined);
    }
  }, [purchaseStatus, queryClient]);

  const availableDeviceCounts = useMemo(() => {
    if (!config) {
      return [1];
    }

    return Array.from(
      { length: config.maxDevicesPerPurchase },
      (_, index) => index + 1,
    );
  }, [config]);

  const priceBreakdown = useMemo(() => {
    if (!config || !selectedPlanId) {
      return null;
    }

    const plan = config.plans.find((item) => item.id === selectedPlanId);
    if (!plan) {
      return null;
    }

    const breakdown = computeSubscriptionPrice({
      basePrice: plan.basePrice,
      deviceCount,
      multiDeviceDiscountEnabled: config.multiDeviceDiscountEnabled,
      multiDeviceDiscountPercent: config.multiDeviceDiscountPercent,
    });

    return {
      ...breakdown,
      fullSurcharge: breakdown.deviceSurcharge,
    };
  }, [config, selectedPlanId, deviceCount]);

  function validateCheckoutSelection() {
    if (!selectedPlanId || !priceBreakdown) {
      setErrorMessage(t('subscribe.errorGeneric'));
      return false;
    }

    return true;
  }

  function handleContinue() {
    setErrorMessage(null);

    if (!validateCheckoutSelection()) {
      return;
    }

    if (!sessionToken) {
      setCheckoutAuthVisible(true);
      return;
    }

    void startCheckout();
  }

  async function startCheckout() {
    setErrorMessage(null);

    const activeSessionToken = useAuthStore.getState().sessionToken;
    if (!activeSessionToken || !selectedPlanId || !priceBreakdown) {
      return;
    }

    setPhase('processing');

    try {
      const result = await checkout.mutateAsync({
        planId: selectedPlanId,
        deviceCount,
        tourIds: [COLOSSEUM_TOUR_ID],
      });

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: result.data.clientSecret,
        merchantDisplayName: 'Aurelia',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        throw new Error(presentError.message);
      }

      setPurchaseId(result.data.purchaseId);
      setPhase('finalizing');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('subscribe.errorGeneric'),
      );
      setPhase('form');
    }
  }

  if (isPaid) {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            <ScreenHeader title={t('subscribe.title')} onDark={heroOnDark} />
            <GlassCard style={styles.card}>
              <ThemedText type="subtitle">{t('subscribe.success')}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {t('subscribe.successHint')}
              </ThemedText>
              <Pressable
                onPress={() => router.back()}
                style={[styles.button, { backgroundColor: theme.primary }]}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.primaryForeground}
                />
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {t('subscribe.done')}
                </ThemedText>
              </Pressable>
            </GlassCard>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isPurchaseFailed) {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            <ScreenHeader title={t('subscribe.title')} onDark={heroOnDark} />
            <GlassCard style={styles.card}>
              <ThemedText themeColor="textSecondary">
                {t('subscribe.errorPayment')}
              </ThemedText>
              <Pressable
                onPress={() => setPhase('form')}
                style={[styles.button, { backgroundColor: theme.primary }]}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={theme.primaryForeground}
                />
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {t('subscribe.title')}
                </ThemedText>
              </Pressable>
            </GlassCard>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (phase === 'processing' || phase === 'finalizing') {
    return (
      <ThemedView transparent style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.content, styles.centered]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText
              themeColor={heroOnDark ? undefined : 'textSecondary'}
              style={[
                styles.centerText,
                heroOnDark ? styles.onDarkMuted : null,
              ]}
            >
              {phase === 'finalizing'
                ? t('subscribe.finalizing')
                : t('subscribe.processing')}
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={t('subscribe.title')}
            subtitle={t('subscribe.subtitle')}
            onDark={heroOnDark}
          />

          {configLoading ? <ActivityIndicator color={theme.primary} /> : null}

          {configError || (!configLoading && !config) ? (
            <ThemedText
              themeColor={heroOnDark ? undefined : 'textSecondary'}
              style={heroOnDark ? styles.onDarkMuted : null}
            >
              {t('subscribe.errorGeneric')}
            </ThemedText>
          ) : null}

          {config ? (
            <GlassCard style={styles.formCard}>
              <ThemedText type="smallBold">
                {t('subscribe.planLabel')}
              </ThemedText>
              <View style={styles.optionRow}>
                {config.plans.map((plan) => {
                  const selected = plan.id === selectedPlanId;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => setSelectedPlanIdOverride(plan.id)}
                      style={[
                        styles.option,
                        {
                          borderColor: selected
                            ? theme.primary
                            : theme.backgroundSelected,
                          backgroundColor: selected
                            ? theme.backgroundSelected
                            : theme.backgroundElement,
                        },
                      ]}
                    >
                      <ThemedText type="smallBold">{plan.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatAmount(plan.basePrice, config.currency)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText type="smallBold">
                {t('subscribe.deviceLabel')}
              </ThemedText>
              <View style={styles.optionRow}>
                {availableDeviceCounts.map((count) => {
                  const selected = count === deviceCount;
                  return (
                    <Pressable
                      key={count}
                      onPress={() => setDeviceCount(count)}
                      style={[
                        styles.deviceOption,
                        {
                          borderColor: selected
                            ? theme.primary
                            : theme.backgroundSelected,
                          backgroundColor: selected
                            ? theme.backgroundSelected
                            : theme.backgroundElement,
                        },
                      ]}
                    >
                      <ThemedText type="smallBold">{count}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {priceBreakdown ? (
                <View
                  style={[
                    styles.pricePanel,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <View style={styles.priceRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('subscribe.priceBase')}
                    </ThemedText>
                    <ThemedText type="small">
                      {formatAmount(priceBreakdown.basePrice, config.currency)}
                    </ThemedText>
                  </View>
                  {deviceCount > 1 ? (
                    <View style={styles.priceRow}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('subscribe.priceDevices')}
                      </ThemedText>
                      <ThemedText type="small">
                        {formatAmount(
                          priceBreakdown.fullSurcharge,
                          config.currency,
                        )}
                      </ThemedText>
                    </View>
                  ) : null}
                  {priceBreakdown.discountAmount > 0 ? (
                    <View style={styles.priceRow}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('subscribe.priceDiscount')} (
                        {priceBreakdown.discountPercent}%)
                      </ThemedText>
                      <ThemedText type="small">
                        -
                        {formatAmount(
                          priceBreakdown.discountAmount,
                          config.currency,
                        )}
                      </ThemedText>
                    </View>
                  ) : null}
                  <View style={styles.priceRow}>
                    <ThemedText type="smallBold">
                      {t('subscribe.priceTotal')}
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {formatAmount(priceBreakdown.total, config.currency)}
                    </ThemedText>
                  </View>
                </View>
              ) : null}

              {errorMessage ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {errorMessage}
                </ThemedText>
              ) : null}

              <Pressable
                onPress={() => handleContinue()}
                disabled={checkout.isPending}
                style={[styles.button, { backgroundColor: theme.primary }]}
              >
                <Ionicons
                  name={!sessionToken ? 'lock-open-outline' : 'card-outline'}
                  size={18}
                  color={theme.primaryForeground}
                />
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {!sessionToken
                    ? t('subscribe.signInToContinue')
                    : priceBreakdown
                      ? t('subscribe.subscribeButton', {
                          amount: formatAmount(
                            priceBreakdown.total,
                            config.currency,
                          ),
                        })
                      : t('subscribe.title')}
                </ThemedText>
              </Pressable>
            </GlassCard>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {config && priceBreakdown ? (
        <CheckoutAuthSheet
          visible={checkoutAuthVisible}
          amountLabel={formatAmount(priceBreakdown.total, config.currency)}
          onClose={() => setCheckoutAuthVisible(false)}
          onSignedIn={() => void startCheckout()}
        />
      ) : null}
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  option: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
    minWidth: 96,
  },
  deviceOption: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 48,
    alignItems: 'center',
  },
  tourRow: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  card: {
    gap: Spacing.two,
  },
  formCard: {
    gap: Spacing.three,
    alignSelf: 'stretch',
  },
  pricePanel: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  onDarkMuted: {
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
  },
});
