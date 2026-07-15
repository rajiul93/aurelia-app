import { Ionicons } from "@react-native-vector-icons/ionicons";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UnlockForm } from "@/components/auth/unlock-form";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";

type CheckoutAuthSheetProps = {
  visible: boolean;
  amountLabel: string;
  onClose: () => void;
  onSignedIn: () => void;
};

export function CheckoutAuthSheet({
  visible,
  amountLabel,
  onClose,
  onSignedIn,
}: CheckoutAuthSheetProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

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
              style={[
                styles.handle,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedText type="subtitle">{t("subscribe.checkoutTitle")}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t("subscribe.checkoutHint", { amount: amountLabel })}
          </ThemedText>

          <UnlockForm
            onUnlocked={() => {
              onClose();
              onSignedIn();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  handleRow: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: Spacing.one,
  },
});
