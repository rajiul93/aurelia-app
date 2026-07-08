import { StyleSheet, Text, View } from "react-native";

import { BrandColors } from "@/theme/colors";

const SIZE = 60;

type CompassOverlayProps = {
  /** Device heading in degrees (0–359, clockwise from north), or null if unknown. */
  heading: number | null;
};

/**
 * A small compass widget. The N/E/S/W ring is fixed and aligned to the
 * north-up map (screen-up = north), while the needle rotates to the live device
 * heading so the user can see which way they are facing. Renders nothing until a
 * heading reading is available.
 */
export function CompassOverlay({ heading }: CompassOverlayProps) {
  if (heading === null) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={[styles.cardinal, styles.north]}>N</Text>
      <Text style={[styles.cardinal, styles.east]}>E</Text>
      <Text style={[styles.cardinal, styles.south]}>S</Text>
      <Text style={[styles.cardinal, styles.west]}>W</Text>

      <View style={[styles.needle, { transform: [{ rotate: `${heading}deg` }] }]}>
        <View style={styles.needleNorth} />
        <View style={styles.needleSouth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "rgba(28, 25, 23, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(225, 165, 102, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardinal: {
    position: "absolute",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  north: { top: 3, color: BrandColors.primary },
  east: { right: 4 },
  south: { bottom: 3 },
  west: { left: 4 },
  needle: {
    alignItems: "center",
    justifyContent: "center",
  },
  needleNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 15,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: BrandColors.primary,
  },
  needleSouth: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 15,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(255, 255, 255, 0.55)",
  },
});
