import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { GoldGradientButton } from "@/components/ui/gold-gradient-button";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type LocationPermissionPrimerProps = {
  onEnable: () => void;
  onSkip: () => void;
};

export function LocationPermissionPrimer({
  onEnable,
  onSkip,
}: LocationPermissionPrimerProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: `${theme.primary}22`, borderColor: `${theme.primary}55` },
        ]}
      >
        <Ionicons name="location" size={30} color={theme.primary} />
      </View>

      <ThemedText type="subtitle" style={styles.title}>
        Find your host, hassle-free
      </ThemedText>

      <ThemedText type="small" style={styles.body}>
        We’ll use your location to show walking distance and directions to your
        host — only while you’re on this screen.
      </ThemedText>

      <GoldGradientButton
        label="Enable Location"
        icon="location"
        onPress={onEnable}
        fullWidth
        style={styles.primaryCta}
      />

      <Pressable
        onPress={onSkip}
        style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
      >
        <ThemedText type="smallBold" style={styles.skipLabel}>
          Not now
        </ThemedText>
      </Pressable>

      <ThemedText type="small" style={styles.hint}>
        You can enable location anytime from the banner
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: Spacing.one,
  },
  title: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: Spacing.two,
  },
  primaryCta: {
    alignSelf: "stretch",
    borderRadius: 18,
    overflow: "hidden",
  },
  skipButton: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingVertical: Spacing.three,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(12, 10, 9, 0.42)",
  },
  skipLabel: {
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.85,
  },
  hint: {
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: Spacing.one,
  },
});
