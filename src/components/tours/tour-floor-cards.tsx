import { useRouter } from "expo-router";

import { FloorCard } from "@/components/tours/floor-card";
import { useInstalledMediaUri } from "@/hooks/use-installed-media-uri";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import { useStrings } from "@/hooks/use-strings";
import { getFloorName, getSpotsForFloor } from "@/lib/bundle/floor-routing";
import { localizeTourTitle } from "@/lib/bundle/localize";

type TourFloorCardsProps = {
  tourId: string;
  /** Stagger offset so cards across tours cascade in, not all at once. */
  baseDelay?: number;
};

type FloorCardItemProps = {
  tourId: string;
  name: string;
  coverUrl?: string | null;
  stopCount: number;
  delay: number;
  onPress: () => void;
};

/**
 * One floor card. Split out so it can resolve the cover to the locally-cached
 * copy — the bundle stores a remote R2 url, but the app is offline-first, so the
 * image only shows without a network once it has been cached on install. The
 * resolver falls back to the remote url when online / not yet cached.
 */
function FloorCardItem({
  tourId,
  name,
  coverUrl,
  stopCount,
  delay,
  onPress,
}: FloorCardItemProps) {
  const { t } = useStrings();
  const localCoverUrl = useInstalledMediaUri(tourId, coverUrl).data ?? coverUrl;

  return (
    <FloorCard
      name={name}
      coverUrl={localCoverUrl}
      stopCount={stopCount}
      stopLabel={stopCount === 1 ? t("floors.stop") : t("floors.stops")}
      exploreLabel={t("floors.explore")}
      delay={delay}
      onPress={onPress}
    />
  );
}

/**
 * The floor cards for one installed tour. Reads the on-disk bundle, so it only
 * renders content the user has actually downloaded — no network. A single-floor
 * (or v1) tour shows one card for the whole tour.
 */
export function TourFloorCards({ tourId, baseDelay = 0 }: TourFloorCardsProps) {
  const router = useRouter();
  const { t } = useStrings();
  const { rawContent, preferences } = useInstalledTourView(tourId);

  if (!rawContent || !preferences) {
    return null;
  }

  const { contentLanguage, audience } = preferences;

  const floors = [...(rawContent.floors ?? [])].sort(
    (left, right) => left.floorNo - right.floorNo,
  );

  // v1 / single-floor tour: one card for the whole tour, opening the map.
  if (floors.length === 0) {
    return (
      <FloorCardItem
        tourId={tourId}
        name={localizeTourTitle(rawContent.tour, contentLanguage, audience)}
        coverUrl={rawContent.tour.coverMedia?.url}
        stopCount={rawContent.tour.spots.length}
        delay={baseDelay}
        onPress={() => router.push(`/tour/${tourId}`)}
      />
    );
  }

  return (
    <>
      {floors.map((floor, index) => (
        <FloorCardItem
          key={floor.id}
          tourId={tourId}
          name={
            getFloorName(floor, contentLanguage, audience) ??
            t("floors.floorN", { number: floor.floorNo })
          }
          coverUrl={floor.coverUrl}
          stopCount={getSpotsForFloor(rawContent, floor.id).length}
          delay={baseDelay + index * 80}
          onPress={() => router.push(`/tour/${tourId}/floor/${floor.id}`)}
        />
      ))}
    </>
  );
}
