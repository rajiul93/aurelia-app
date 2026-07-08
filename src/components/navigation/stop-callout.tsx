import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { STOP_PIN_COLOR } from "@/components/navigation/stop-pin";

type StopCalloutProps = {
  label: number | string;
  title: string;
  viewDetailsLabel: string;
  onViewDetails: () => void;
  onClose: () => void;
};

/**
 * The small popup shown when a stop pin is tapped: a numbered badge, the stop
 * name, and a "View Details" action. Pure React Native (no map glyphs, no
 * network), so it works fully offline. Meant to sit in a `<Marker>` anchored
 * above the tapped pin.
 */
export function StopCallout({
  label,
  title,
  viewDetailsLabel,
  onViewDetails,
  onClose,
}: StopCalloutProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{label}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={18} color="#57534e" />
          </Pressable>
        </View>
        <Pressable
          onPress={onViewDetails}
          style={styles.button}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{viewDetailsLabel}</Text>
        </Pressable>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  card: {
    width: 232,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: STOP_PIN_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  title: {
    flex: 1,
    color: "#1c1917",
    fontWeight: "700",
    fontSize: 15,
  },
  close: {
    padding: 2,
  },
  button: {
    backgroundColor: STOP_PIN_COLOR,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#ffffff",
    marginTop: -1,
  },
});
