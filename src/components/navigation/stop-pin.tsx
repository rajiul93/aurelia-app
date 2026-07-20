import { StyleSheet, Text, View } from "react-native";

import { BrandColors } from "@/theme/colors";

/** Burgundy pin colour matching the tour-stop reference design. */
export const STOP_PIN_COLOR = "#8a1e3f";

type StopPinProps = {
  label: number | string;
  /** The tour's first stop is emphasised with a brand-gold ring. */
  isStart?: boolean;
};

/**
 * A teardrop location pin (numbered head + pointed tail) rendered as a plain
 * React Native view. Because the number is RN text — not a MapLibre symbol
 * layer — it needs no cached glyphs and renders fully offline. Meant to be
 * placed in a `<Marker anchor="bottom">` so the tail tip sits on the coordinate.
 */
export function StopPin({ label, isStart = false }: StopPinProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.head, isStart && styles.headStart]}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  head: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: STOP_PIN_COLOR,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.92)",
  },
  headStart: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: BrandColors.primary,
    borderWidth: 3,
  },
  label: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: STOP_PIN_COLOR,
    marginTop: -3,
  },
});
