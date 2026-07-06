/** Readable outdoor style with roads, parks, water, and place labels. */
export const TOUR_MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

export function getTourMapStyle() {
  return TOUR_MAP_STYLE_URL;
}

export function getTourMapPackName(tourId: string) {
  return `aurelia-tour-${tourId}`;
}
