import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import {
  getGreetingName,
  InstalledGuideCard,
} from "@/components/tours/installed-guide-card";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import type { EntitledVersions } from "@/lib/bundle/version-compare";
import type { InstalledTourMeta } from "@/types/tour-bundle";

type GuidesHubSectionProps = {
  guides: InstalledTourMeta[];
  email: string | null;
  coverUrlByTourId: Map<string, string | null | undefined>;
  onDarkBackground?: boolean;
  isTourLocked?: (tourId: string) => boolean;
  getEntitledVersions?: (tourId: string) => EntitledVersions | null;
};

export function GuidesHubSection({
  guides,
  email,
  coverUrlByTourId,
  onDarkBackground = false,
  isTourLocked,
  getEntitledVersions,
}: GuidesHubSectionProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t, getTimeGreeting, guideFeatures } = useStrings();
  const greetingName = getGreetingName(email);

  if (guides.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {greetingName ? (
        <View style={styles.greetingRow}>
          <View style={styles.greeting}>
            <ThemedText
              type="small"
              style={onDarkBackground ? styles.onDarkMuted : undefined}
              themeColor={onDarkBackground ? undefined : "textSecondary"}
            >
              {getTimeGreeting()},
            </ThemedText>
            <ThemedText
              type="subtitle"
              style={[
                styles.greetingName,
                onDarkBackground ? styles.onDarkText : undefined,
              ]}
            >
              {greetingName}
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel={t("guides.openSettings")}
            onPress={() => router.push("/settings")}
            style={[
              styles.settingsButton,
              {
                borderColor: onDarkBackground
                  ? "rgba(255, 255, 255, 0.35)"
                  : theme.backgroundSelected,
              },
            ]}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={onDarkBackground ? "#ffffff" : theme.primary}
            />
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.featuresCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <ThemedText type="smallBold" themeColor="primary">
          {t("guides.whatsIncluded")}
        </ThemedText>
        <View style={styles.featureList}>
          {guideFeatures.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <Ionicons name={feature.icon} size={16} color={theme.primary} />
              <View style={styles.featureCopy}>
                <ThemedText type="smallBold">{feature.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {feature.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.guideList}>
        {guides.map((guide) => (
          <InstalledGuideCard
            key={guide.tourId}
            guide={guide}
            coverUrl={coverUrlByTourId.get(guide.tourId)}
            locked={isTourLocked?.(guide.tourId) ?? false}
            entitledVersions={getEntitledVersions?.(guide.tourId) ?? null}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    gap: Spacing.three,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  greeting: {
    flex: 1,
    gap: Spacing.half,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingName: {
    fontSize: 24,
    lineHeight: 30,
  },
  onDarkText: {
    color: "#ffffff",
  },
  onDarkMuted: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  featuresCard: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  featureList: {
    gap: Spacing.two,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  featureCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  guideList: {
    alignSelf: "stretch",
    gap: Spacing.three,
  },
});
