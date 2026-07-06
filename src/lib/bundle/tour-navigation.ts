import type { Href } from "expo-router";

/** Opens the installed tour stop list (pick a stop before viewing details). */
export function getTourStopsPath(tourId: string): Href {
  return `/tour/${tourId}` as Href;
}

/** @deprecated Use getTourStopsPath — tours always start on the stop list. */
export function getContinueTourPath(tourId: string): Href {
  return getTourStopsPath(tourId);
}
