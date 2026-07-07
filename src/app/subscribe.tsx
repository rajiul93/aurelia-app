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
import { Spacing } from '@/constants/theme';
import { useCheckout } from '@/hooks/mutations/use-checkout';
import { useCatalogTours } from '@/hooks/queries/use-catalog';
import { usePurchaseStatus } from '@/hooks/queries/use-purchase-status';
import { useSubscriptionConfig } from '@/hooks/queries/use-subscription-config';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query/keys';
import { computeSubscriptionPrice } from '@/lib/subscription-pricing';
import { useAuthStore } from '@/store/auth-store';

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

  const {
    data: configResponse,
    isLoading: configLoading,
    isError: configError,
  } = useSubscriptionConfig();
  const { data: toursResponse, isLoading: toursLoading } = useCatalogTours();
  const checkout = useCheckout();

  const config = configResponse?.data;
  const tours = toursResponse?.data ?? [];

  const [selectedPlanIdOverride, setSelectedPlanIdOverride] = useState<
    string | null
  >(null);
  const selectedPlanId = selectedPlanIdOverride ?? config?.plans[0]?.id ?? null;

  const [deviceCount, setDeviceCount] = useState(1);
  const [selectedTourIds, setSelectedTourIds] = useState<string[]>([]);
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.entitlements.me,
      });
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

  function toggleTour(tourId: string) {
    setSelectedTourIds((current) =>
      current.includes(tourId)
        ? current.filter((id) => id !== tourId)
        : [...current, tourId],
    );
  }

  function validateCheckoutSelection() {
    if (!selectedPlanId || !priceBreakdown) {
      setErrorMessage(t('subscribe.errorGeneric'));
      return false;
    }

    if (selectedTourIds.length === 0) {
      setErrorMessage(t('subscribe.selectAtLeastOneTour'));
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

    if (selectedTourIds.length === 0) {
      setErrorMessage(t('subscribe.selectAtLeastOneTour'));
      return;
    }

    setPhase('processing');

    try {
      const result = await checkout.mutateAsync({
        planId: selectedPlanId,
        deviceCount,
        tourIds: selectedTourIds,
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
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            <ScreenHeader title={t('subscribe.title')} />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ThemedText type="subtitle">{t('subscribe.success')}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {t('subscribe.successHint')}
              </ThemedText>
              <Pressable
                onPress={() => router.back()}
                style={[styles.button, { backgroundColor: theme.primary }]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {t('subscribe.done')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isPurchaseFailed) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            <ScreenHeader title={t('subscribe.title')} />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ThemedText themeColor="textSecondary">
                {t('subscribe.errorPayment')}
              </ThemedText>
              <Pressable
                onPress={() => setPhase('form')}
                style={[styles.button, { backgroundColor: theme.primary }]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {t('subscribe.title')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (phase === 'processing' || phase === 'finalizing') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.content, styles.centered]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={t('subscribe.title')}
            subtitle={t('subscribe.subtitle')}
          />

          {configLoading ? <ActivityIndicator color={theme.primary} /> : null}

          {configError || (!configLoading && !config) ? (
            <ThemedText themeColor="textSecondary">
              {t('subscribe.errorGeneric')}
            </ThemedText>
          ) : null}

          {config ? (
            <>
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
                            : 'transparent',
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
                            : 'transparent',
                        },
                      ]}
                    >
                      <ThemedText type="smallBold">{count}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText type="smallBold">
                {t('subscribe.toursLabel')}
              </ThemedText>
              {toursLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : null}
              {!toursLoading && tours.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('subscribe.noToursAvailable')}
                </ThemedText>
              ) : null}
              {tours.map((tour) => {
                const checked = selectedTourIds.includes(tour.id);
                return (
                  <Pressable
                    key={tour.id}
                    onPress={() => toggleTour(tour.id)}
                    style={[
                      styles.tourRow,
                      {
                        borderColor: checked
                          ? theme.primary
                          : theme.backgroundSelected,
                        backgroundColor: checked
                          ? theme.backgroundSelected
                          : 'transparent',
                      },
                    ]}
                  >
                    <ThemedText type="small">{tour.title}</ThemedText>
                  </Pressable>
                );
              })}

              {priceBreakdown ? (
                <View
                  style={[
                    styles.card,
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
            </>
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
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
  },
});
