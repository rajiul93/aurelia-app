import { Ionicons } from "@react-native-vector-icons/ionicons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useEntitlementStatus } from "@/hooks/use-entitlement-status";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth-store";

function formatExpiry(expiresAt: string | undefined) {
  if (!expiresAt) {
    return null;
  }

  return new Date(expiresAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AccessSettingsPanel() {
  const theme = useTheme();
  const { t } = useStrings();
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const phone = useAuthStore((state) => state.phone);
  const {
    entitlements,
    isActive,
    isLoadingAccess,
    isFetchingAccess,
    refetchAccess,
  } = useEntitlementStatus();

  if (!sessionToken) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        <ThemedText type="smallBold">{t("settings.access")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("settings.accessSignedOutHint")}
        </ThemedText>
      </View>
    );
  }

  const expiryLabel = formatExpiry(entitlements?.expiresAt);
  const statusLabel =
    entitlements?.status === "ACTIVE" && isActive
      ? t("settings.accessStatusActive")
      : t("settings.accessStatusInactive");

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement },
      ]}
    >
      <ThemedText type="smallBold">{t("settings.access")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("settings.accessHint")}
      </ThemedText>

      {isLoadingAccess ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : (
        <View style={styles.meta}>
          {phone ? (
            <ThemedText type="small" themeColor="primary">
              {phone}
            </ThemedText>
          ) : null}
          <ThemedText type="smallBold">{statusLabel}</ThemedText>
          {expiryLabel ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t("settings.accessExpires", { date: expiryLabel })}
            </ThemedText>
          ) : null}
          {entitlements ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t("settings.accessToursUnlocked", {
                count: entitlements.tours.length,
              })}
            </ThemedText>
          ) : null}
        </View>
      )}

      <Pressable
        disabled={isFetchingAccess}
        onPress={() => void refetchAccess()}
        style={[
          styles.refreshButton,
          { borderColor: theme.backgroundSelected },
        ]}
      >
        {isFetchingAccess ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <>
            <Ionicons name="refresh" size={16} color={theme.text} />
            <ThemedText type="smallBold">{t("settings.refreshAccess")}</ThemedText>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  loader: {
    marginTop: Spacing.one,
  },
  meta: {
    gap: Spacing.one,
  },
  refreshButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
    minWidth: 140,
  },
});
