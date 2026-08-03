import { StyleSheet, Text, View } from "react-native";

import { BrandColors } from "@/theme/colors";

const SIZE = 60;

type CompassOverlayProps = {
  /** Device heading in degrees (0–359, clockwise from north), or null if unknown. */
  heading: number | null;
  /** Map rotation in degrees (0 = north-up), from the map's two-finger rotate. */
  mapBearing?: number;
};

/**
 * A small compass widget. The whole dial counter-rotates by the map's bearing,
 * so the N/E/S/W ring keeps pointing at the map's true north however the user
 * has turned the map. The needle sits inside that dial and is rotated by the raw
 * device heading, which puts it at `heading - mapBearing` on screen — where the
 * user is actually facing relative to what they see.
 *
 * Renders whenever there is something to show: a heading, a rotated map, or
 * both. With no heading the needle is hidden but the ring still tells you which
 * way north is, which is the whole point once the map can be spun.
 */
export function CompassOverlay({ heading, mapBearing = 0 }: CompassOverlayProps) {
  if (heading === null && mapBearing === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { transform: [{ rotate: `${-mapBearing}deg` }] }]}
      pointerEvents="none"
    >
      <Text style={[styles.cardinal, styles.north]}>N</Text>
      <Text style={[styles.cardinal, styles.east]}>E</Text>
      <Text style={[styles.cardinal, styles.south]}>S</Text>
      <Text style={[styles.cardinal, styles.west]}>W</Text>

      {heading === null ? null : (
        <View style={[styles.needle, { transform: [{ rotate: `${heading}deg` }] }]}>
          <View style={styles.needleNorth} />
          <View style={styles.needleSouth} />
        </View>
      )}
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
