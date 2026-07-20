import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** White text over the global photo when a CMS background is active. */
  onDark?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  onDark,
}: ScreenHeaderProps) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack ?? (() => router.back())}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </Pressable>
      </View>
      <View style={styles.titleBlock}>
        <ThemedText
          type="smallBold"
          style={[styles.title, onDark ? styles.onDarkTitle : null]}
        >
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            type="small"
            themeColor={onDark ? undefined : "textSecondary"}
            style={onDark ? styles.onDarkSubtitle : null}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    alignSelf: "stretch",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -Spacing.one,
  },
  titleBlock: {
    gap: Spacing.one,
    alignSelf: "stretch",
  },
  title: {
    alignSelf: "stretch",
  },
  onDarkTitle: {
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  onDarkSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
