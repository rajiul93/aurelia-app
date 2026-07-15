import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { AudienceType } from "@/constants/audiences";
import { Spacing } from "@/constants/theme";
import { useInstalledMediaUri } from "@/hooks/use-installed-media-uri";
import { useTheme } from "@/hooks/use-theme";
import { getFloorName } from "@/lib/bundle/floor-routing";
import type { AppLanguage } from "@/store/locale-store";
import type { BundleContent, BundleFloor } from "@/types/bundle-content";

type FloorSelectorProps = {
  tourId: string;
  content: BundleContent;
  selectedFloorId: string;
  onSelectFloor: (floorId: string) => void;
  language: AppLanguage;
  audience: AudienceType;
};

type FloorChipProps = {
  tourId: string;
  floor: BundleFloor;
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

function FloorChip({ tourId, floor, label, isSelected, onPress }: FloorChipProps) {
  const theme = useTheme();
  // Offline-first: the bundle holds a remote url; use the locally-cached copy
  // when it exists, falling back to remote online.
  const coverUrl = useInstalledMediaUri(tourId, floor.coverUrl).data ?? floor.coverUrl;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: isSelected ? theme.primary : "rgba(28, 25, 23, 0.82)",
        },
      ]}
    >
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={styles.cover}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <ThemedText
            type="smallBold"
            style={{ color: isSelected ? theme.primaryForeground : "#ffffff" }}
          >
            {floor.floorNo}
          </ThemedText>
        </View>
      )}
      <ThemedText
        type="smallBold"
        numberOfLines={1}
        style={[
          styles.label,
          { color: isSelected ? theme.primaryForeground : "#ffffff" },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function FloorSelector({
  tourId,
  content,
  selectedFloorId,
  onSelectFloor,
  language,
  audience,
}: FloorSelectorProps) {
  const floors = content.floors ?? [];

  // A single floor is just "the tour" — nothing to switch between.
  if (floors.length <= 1) {
    return null;
  }

  const ordered = [...floors].sort((left, right) => left.floorNo - right.floorNo);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {ordered.map((floor) => (
        <FloorChip
          key={floor.id}
          tourId={tourId}
          floor={floor}
          label={
            getFloorName(floor, language, audience) ?? `Floor ${floor.floorNo}`
          }
          isSelected={floor.id === selectedFloorId}
          onPress={() => onSelectFloor(floor.id)}
        />
      ))}
    </ScrollView>
  );
}

const COVER_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingRight: Spacing.three,
    paddingLeft: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: 20,
    maxWidth: 180,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: COVER_SIZE / 2,
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  label: {
    flexShrink: 1,
  },
});
