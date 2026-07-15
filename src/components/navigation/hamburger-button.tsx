import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { useDrawerStore } from "@/store/drawer-store";

export function HamburgerButton() {
  const openDrawer = useDrawerStore((state) => state.openDrawer);

  return (
    <Pressable
      accessibilityLabel="Open menu"
      accessibilityRole="button"
      hitSlop={6}
      onPress={openDrawer}
      style={({ pressed }) => [
        styles.pressable,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.button}>
        <Ionicons name="menu" size={24} color="#ffffff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "flex-start",
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    // Soft watermark wash — readable without a hard card
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
});
