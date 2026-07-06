import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import {
  canStartGuidedWalk,
  getNavigationBlockReason,
  type NavigationBlockReason,
} from "@/lib/navigation/readiness";
import { isMapLibreNativeAvailable } from "@/lib/map/native-available";
import { useRemoteConfig } from "@/store/release-config-store";
import type { BundleContent } from "@/types/bundle-content";

type GuidedWalkSectionProps = {
  tourId: string;
  content: BundleContent;
};

function getHintKey(reason: NavigationBlockReason) {
  switch (reason) {
    case "gps_disabled":
      return "nav.gpsDisabledHint" as const;
    case "missing_coordinates":
      return "nav.missingCoordinatesHint" as const;
    case "insufficient_route":
      return "nav.insufficientRouteHint" as const;
    default:
      return null;
  }
}

export function GuidedWalkSection({ tourId, content }: GuidedWalkSectionProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const remote = useRemoteConfig();
  const blockReason = getNavigationBlockReason(
    content,
    remote.enableGpsNavigation,
  );
  const canStart = canStartGuidedWalk(content, remote.enableGpsNavigation);
  const hintKey = getHintKey(blockReason);
  const needsDevBuild = canStart && !isMapLibreNativeAvailable();

  if (canStart) {
    return (
      <View style={styles.startSection}>
        <Pressable
          onPress={() => router.push(`/tour/${tourId}/nav`)}
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="footsteps" size={18} color={theme.primaryForeground} />
          <ThemedText type="smallBold" style={{ color: theme.primaryForeground }}>
            {t("nav.startGuidedWalk")}
          </ThemedText>
        </Pressable>
        {needsDevBuild ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t("nav.requiresDevBuild")}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  if (!hintKey) {
    return null;
  }

  return (
    <View
      style={[
        styles.hintCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.hintHeader}>
        <Ionicons name="map-outline" size={18} color={theme.textSecondary} />
        <ThemedText type="smallBold">{t("nav.unavailableTitle")}</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {t(hintKey)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  startSection: {
    alignSelf: "stretch",
    gap: Spacing.two,
  },
  primaryButton: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  hintCard: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  hintHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
});
