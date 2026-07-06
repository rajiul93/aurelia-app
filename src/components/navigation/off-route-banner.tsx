import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";

type OffRouteBannerProps = {
  distanceM: number;
};

export function OffRouteBanner({ distanceM }: OffRouteBannerProps) {
  const theme = useTheme();
  const { t } = useStrings();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: `${theme.primary}22`,
          borderColor: theme.primary,
        },
      ]}
    >
      <ThemedText type="smallBold">{t("nav.offRouteTitle")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("nav.offRouteHint", { distance: Math.round(distanceM) })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
