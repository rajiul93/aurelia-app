import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { HostStatusChip } from "@/components/host/host-status-chip";
import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { Spacing } from "@/constants/theme";
import { useDeviceLanguage } from "@/hooks/useDeviceLanguage";
import { useTheme } from "@/hooks/use-theme";
import type { Host } from "@/types/host";

type HostCardProps = {
  host: Host;
  distanceM?: number;
  durationS?: number;
  onShowMap?: () => void;
  onGetDirections?: () => void;
  isLoadingDirections?: boolean;
  tourId?: string;
};

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

function formatDuration(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min walk`;
}

export function HostCard({
  host,
  distanceM,
  durationS,
  onShowMap,
  onGetDirections,
  isLoadingDirections,
  tourId,
}: HostCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const language = useDeviceLanguage();
  const bio =
    host.translations.find((entry) => entry.language === language)?.bio || "";

  function openMap() {
    if (onShowMap) {
      onShowMap();
      return;
    }
    if (tourId) {
      router.push(`/find-host/${tourId}/${host.id}/map`);
    }
  }

  return (
    <GlassCard style={styles.card}>
      {host.photoUrl ? (
        <Image
          source={{ uri: host.photoUrl }}
          style={styles.photo}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.photoFallback, { backgroundColor: `${theme.primary}22` }]}>
          <Ionicons name="person" size={36} color={theme.primary} />
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
            {host.name}
          </ThemedText>
          {host.role ? (
            <ThemedText type="small" style={styles.role} numberOfLines={1}>
              {host.role}
            </ThemedText>
          ) : null}
        </View>
        <HostStatusChip host={host} />
      </View>

      {distanceM !== undefined ? (
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location" size={14} color={theme.primary} />
            <ThemedText type="small" style={styles.metaText}>
              {formatDistance(distanceM)}
            </ThemedText>
          </View>
          {durationS !== undefined ? (
            <View style={styles.metaItem}>
              <Ionicons name="time" size={14} color={theme.primary} />
              <ThemedText type="small" style={styles.metaText}>
                {formatDuration(durationS)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {bio ? (
        <ThemedText type="small" style={styles.bio} numberOfLines={3}>
          {bio}
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={openMap}
          style={({ pressed }) => [
            styles.mapButton,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="map" size={16} color={theme.primaryForeground} />
          <ThemedText
            type="smallBold"
            style={{ color: theme.primaryForeground }}
          >
            Map
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={onGetDirections}
          disabled={isLoadingDirections}
          style={({ pressed }) => [
            styles.directionsButton,
            { borderColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          {isLoadingDirections ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Ionicons name="navigate" size={16} color={theme.primary} />
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                Directions
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    borderRadius: 20,
    padding: Spacing.three,
  },
  photo: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  photoFallback: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: "#ffffff",
    fontSize: 17,
    lineHeight: 22,
  },
  role: {
    color: "rgba(255,255,255,0.7)",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  metaText: {
    color: "rgba(255,255,255,0.85)",
  },
  bio: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  mapButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: 14,
    paddingVertical: Spacing.three,
  },
  directionsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    borderWidth: 1.5,
    backgroundColor: "rgba(12, 10, 9, 0.35)",
  },
  pressed: {
    opacity: 0.86,
  },
});
