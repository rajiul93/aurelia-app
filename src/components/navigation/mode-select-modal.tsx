import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { GoldGradientButton } from "@/components/ui/gold-gradient-button";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";

type ModeSelectModalProps = {
  visible: boolean;
  onSelectExplore: () => void;
  onSelectWalk: () => void;
};

export function ModeSelectModal({
  visible,
  onSelectExplore,
  onSelectWalk,
}: ModeSelectModalProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onSelectExplore}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.four),
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View
              style={[styles.handle, { backgroundColor: theme.backgroundSelected }]}
            />
          </View>

          <View
            style={[styles.iconBadge, { backgroundColor: theme.backgroundElement }]}
          >
            <Ionicons name="map" size={26} color={theme.primary} />
          </View>

          <ThemedText type="subtitle">{t("nav.modeSelect.title")}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t("nav.modeSelect.subtitle")}
          </ThemedText>

          <View style={styles.optionsContainer}>
            <Pressable
              onPress={onSelectExplore}
              style={[
                styles.optionButton,
                styles.exploreButton,
                { borderColor: theme.primary },
              ]}
            >
              <Ionicons name="map-outline" size={20} color={theme.primary} />
              <ThemedText type="smallBold">{t("nav.modeSelect.exploreCta")}</ThemedText>
            </Pressable>

            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.optionHint}
            >
              {t("nav.modeSelect.exploreHint")}
            </ThemedText>

            <View style={styles.spacer} />

            <GoldGradientButton
              label={t("nav.modeSelect.walkCta")}
              icon="footsteps"
              fullWidth
              onPress={onSelectWalk}
            />

            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.optionHint}
            >
              {t("nav.modeSelect.walkHint")}
            </ThemedText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: Spacing.three,
  },
  handleRow: {
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.three,
  },
  optionsContainer: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
  },
  exploreButton: {
    backgroundColor: "transparent",
  },
  optionHint: {
    marginHorizontal: Spacing.two,
  },
  spacer: {
    height: Spacing.two,
  },
});
