import { TourCard } from "@/components/tours/tour-card";
import { useInstalledTourView } from "@/hooks/use-installed-tour-view";
import type { EntitledVersions } from "@/lib/bundle/version-compare";
import type { InstalledTourMeta } from "@/types/tour-bundle";

type InstalledTourCardProps = {
  guide: InstalledTourMeta;
  unlocked: boolean;
  entitledVersions?: EntitledVersions;
  delay?: number;
};

/**
 * A downloaded tour the catalog did not return — which is the normal state
 * offline, since the catalog query is not persisted. Everything the card needs
 * comes off disk, so the visitor can still open what they paid for with no
 * network.
 *
 * Kept separate from `TourCard` so only these cards pay for a bundle read;
 * a catalog-backed card already has its cover and counts from the API.
 */
export function InstalledTourCard({
  guide,
  unlocked,
  entitledVersions,
  delay,
}: InstalledTourCardProps) {
  const { rawContent } = useInstalledTourView(guide.tourId);

  return (
    <TourCard
      tourId={guide.tourId}
      slug={guide.slug}
      title={guide.title}
      coverUrl={rawContent?.tour.coverMedia?.url}
      floorCount={rawContent?.floors?.length ?? 0}
      stopCount={guide.totalStops}
      unlocked={unlocked}
      entitledVersions={entitledVersions}
      delay={delay}
    />
  );
}
