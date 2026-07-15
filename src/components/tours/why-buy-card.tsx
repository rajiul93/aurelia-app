import { Ionicons } from "@react-native-vector-icons/ionicons";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import type { StringKey } from "@/i18n/strings";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const BENEFITS: {
  icon: IoniconName;
  titleKey: StringKey;
  descKey: StringKey;
}[] = [
  {
    icon: "navigate-outline",
    titleKey: "whyBuy.offlineTitle",
    descKey: "whyBuy.offlineDesc",
  },
  {
    icon: "sparkles-outline",
    titleKey: "whyBuy.aiTitle",
    descKey: "whyBuy.aiDesc",
  },
  {
    icon: "location-outline",
    titleKey: "whyBuy.poiTitle",
    descKey: "whyBuy.poiDesc",
  },
  {
    icon: "language-outline",
    titleKey: "whyBuy.langTitle",
    descKey: "whyBuy.langDesc",
  },
  {
    icon: "shield-checkmark-outline",
    titleKey: "whyBuy.verifiedTitle",
    descKey: "whyBuy.verifiedDesc",
  },
  {
    icon: "trophy-outline",
    titleKey: "whyBuy.experienceTitle",
    descKey: "whyBuy.experienceDesc",
  },
];

/** Gold tint from BrandColors.primary (#e1a566) for the benefit icon chips. */
const ICON_TINT = "rgba(225, 165, 102, 0.16)";

export function WhyBuyCard() {
  const theme = useTheme();
  const { t } = useStrings();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          {t("whyBuy.title")}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("whyBuy.subtitle")}
        </ThemedText>
      </View>

      <View style={styles.list}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.titleKey} style={styles.row}>
            <View style={[styles.iconChip, { backgroundColor: ICON_TINT }]}>
              <Ionicons name={benefit.icon} size={20} color={theme.primary} />
            </View>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{t(benefit.titleKey)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t(benefit.descKey)}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  list: {
    gap: Spacing.four,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
