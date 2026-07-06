import { Ionicons } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { GoldBorderView } from "@/components/ui/gold-border-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { GoldGradientHorizontal } from "@/theme/gradients";

type StopListCardProps = {
  index: number;
  title: string;
  subtitle?: string;
  completed: boolean;
  isNext: boolean;
  bookmarked?: boolean;
  onPress: () => void;
};

export function StopListCard({
  index,
  title,
  subtitle,
  completed,
  isNext,
  bookmarked = false,
  onPress,
}: StopListCardProps) {
  const theme = useTheme();

  const content = (
    <Pressable onPress={onPress} style={styles.cardInner}>
      <View
        style={[
          styles.stopNumber,
          isNext
            ? styles.stopNumberActive
            : {
                borderWidth: 1,
                borderColor: "rgba(225, 165, 102, 0.5)",
              },
        ]}
      >
        {completed ? (
          <Ionicons name="checkmark" size={18} color={theme.primary} />
        ) : (
          <ThemedText
            type="smallBold"
            style={{
              color: isNext ? "#1a1208" : theme.primary,
            }}
          >
            {index + 1}
          </ThemedText>
        )}
      </View>

      <View style={styles.stopMeta}>
        <View style={styles.titleRow}>
          <ThemedText
            type="smallBold"
            style={{
              color: isNext ? "#1a1208" : theme.text,
              flex: 1,
            }}
          >
            {title}
          </ThemedText>
          {bookmarked ? (
            <Ionicons name="bookmark" size={16} color={theme.primary} />
          ) : null}
        </View>
        {subtitle ? (
          <ThemedText
            type="small"
            style={{
              color: isNext ? "rgba(26,18,8,0.65)" : theme.textSecondary,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={isNext ? "#1a1208" : theme.primary}
      />
    </Pressable>
  );

  if (isNext) {
    return (
      <LinearGradient {...GoldGradientHorizontal} style={styles.activeShell}>
        {content}
      </LinearGradient>
    );
  }

  return (
    <GoldBorderView innerBackground={theme.backgroundElement}>
      {content}
    </GoldBorderView>
  );
}

const styles = StyleSheet.create({
  activeShell: {
    borderRadius: Spacing.three,
    alignSelf: "stretch",
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stopNumberActive: {
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  stopMeta: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
});
