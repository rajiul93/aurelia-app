import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useHostAvailability } from "@/hooks/use-host-availability";
import type { Host } from "@/types/host";

type HostStatusChipProps = {
  host: Host;
};

export function HostStatusChip({ host }: HostStatusChipProps) {
  const available = useHostAvailability(host);

  return (
    <View
      style={[
        styles.chip,
        available ? styles.chipAvailable : styles.chipOffline,
      ]}
    >
      <View
        style={[styles.dot, available ? styles.dotAvailable : styles.dotOffline]}
      />
      <ThemedText type="smallBold" style={styles.label}>
        {available ? "Available now" : "Offline"}
      </ThemedText>
      {available && host.availableTo ? (
        <ThemedText type="small" style={styles.until}>
          until {host.availableTo}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipAvailable: {
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    borderColor: "rgba(34, 197, 94, 0.45)",
  },
  chipOffline: {
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotAvailable: {
    backgroundColor: "#4ade80",
  },
  dotOffline: {
    backgroundColor: "#f87171",
  },
  label: {
    color: "#ffffff",
    fontSize: 12,
    lineHeight: 16,
  },
  until: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    lineHeight: 14,
  },
});
