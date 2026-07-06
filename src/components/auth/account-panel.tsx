import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AccessEndedBanner } from "@/components/auth/access-ended-banner";
import { SignInForm } from "@/components/auth/sign-in-form";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useSignOut } from "@/hooks/mutations/use-auth";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth-store";

export function AccountPanel() {
  const theme = useTheme();
  const { t } = useStrings();
  const email = useAuthStore((state) => state.email);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const signOut = useSignOut();
  const {
    data: entitlementsResponse,
    isLoading,
    isError,
    error,
  } = useEntitlements();

  if (!sessionToken) {
    return (
      <View style={styles.signedOut}>
        <AccessEndedBanner />
        <SignInForm />
      </View>
    );
  }

  const entitlements = entitlementsResponse?.data;

  return (
    <View style={styles.signedIn}>
      <AccessEndedBanner />
      <View
        style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      >
        <ThemedText type="smallBold" style={styles.wrapText}>
          {t("account.signedIn")}
        </ThemedText>
        <ThemedText type="small" themeColor="primary" style={styles.wrapText}>
          {email}
        </ThemedText>

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : null}

        {isError ? (
          <ThemedText type="small" style={styles.wrapText}>
            {error instanceof Error ? error.message : t("account.couldNotLoadAccess")}
          </ThemedText>
        ) : null}

        {entitlements ? (
          <View style={styles.metaBlock}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.wrapText}>
              {entitlements.ticketCount}{" "}
              {entitlements.ticketCount === 1
                ? t("account.ticket")
                : t("account.tickets")}{" "}
              · {entitlements.activeDeviceCount}{" "}
              {entitlements.activeDeviceCount === 1
                ? t("account.activeDevice")
                : t("account.activeDevices")}{" "}
              · {entitlements.seatsRemaining}{" "}
              {entitlements.seatsRemaining === 1
                ? t("account.seatLeft")
                : t("account.seatsLeft")}
            </ThemedText>

            {entitlements.tours.length > 0 ? (
              <View style={styles.tourList}>
                <ThemedText type="smallBold" style={styles.wrapText}>
                  {t("account.unlockedTours")}
                </ThemedText>
                {entitlements.tours.map((tour) => (
                  <ThemedText
                    key={tour.id}
                    type="small"
                    themeColor="textSecondary"
                    style={styles.wrapText}
                  >
                    {tour.title}
                  </ThemedText>
                ))}
              </View>
            ) : (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.wrapText}
              >
                {t("account.noUnlockedTours")}
              </ThemedText>
            )}
          </View>
        ) : null}

        <Pressable
          disabled={signOut.isPending}
          onPress={() => void signOut.mutateAsync()}
          style={[
            styles.signOutButton,
            { borderColor: theme.backgroundSelected },
          ]}
        >
          {signOut.isPending ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <ThemedText type="smallBold">{t("account.signOut")}</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  signedOut: {
    alignSelf: "stretch",
    gap: Spacing.three,
  },
  signedIn: {
    alignSelf: "stretch",
  },
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  wrapText: {
    flexShrink: 1,
    alignSelf: "stretch",
  },
  loader: {
    marginTop: Spacing.one,
  },
  metaBlock: {
    gap: Spacing.two,
  },
  tourList: {
    gap: Spacing.one,
  },
  signOutButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
});
