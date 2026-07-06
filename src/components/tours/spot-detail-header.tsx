import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SpotDetailHeaderProps = {
  stopLabel: string;
  bookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: () => void;
};

export function SpotDetailHeader({
  stopLabel,
  bookmarked,
  onClose,
  onToggleBookmark,
}: SpotDetailHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Close"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onClose}
        style={styles.sideButton}
      >
        <Ionicons name="close" size={22} color="#ffffff" />
      </Pressable>

      <ThemedText type="small" style={styles.centerLabel}>
        {stopLabel}
      </ThemedText>

      <Pressable
        accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark stop"}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onToggleBookmark}
        style={styles.sideButton}
      >
        <Ionicons
          name={bookmarked ? "bookmark" : "bookmark-outline"}
          size={22}
          color={theme.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingTop: Spacing.two,
  },
  sideButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    flex: 1,
  },
});
