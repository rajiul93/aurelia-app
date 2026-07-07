import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, StyleSheet } from "react-native";

import { useDrawerStore } from "@/store/drawer-store";
import { useTheme } from "@/hooks/use-theme";

export function HamburgerButton() {
  const theme = useTheme();
  const openDrawer = useDrawerStore((state) => state.openDrawer);

  return (
    <Pressable
      accessibilityLabel="Open menu"
      accessibilityRole="button"
      hitSlop={8}
      onPress={openDrawer}
      style={styles.button}
    >
      <Ionicons name="menu" size={26} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },
});
