import type { StyleSpecification } from "@maplibre/maplibre-react-native";

/**
 * OpenFreeMap vector tiles (planet). The per-tour offline pack caches tiles from
 * THIS source within the tour bounds/zoom, so the live style object below and the
 * pack (created from the URL style) must reference the same source URL + zoom
 * range — otherwise the live map requests tiles the pack never cached.
 */
const OPENFREEMAP_SOURCE_URL = "https://tiles.openfreemap.org/planet";

/**
 * Style URL used ONLY for offline-pack creation — `OfflineManager.createPack`
 * takes a URL string. `liberty` resolves to the same openfreemap `/planet`
 * vector source as the inline style object below, so the tiles the pack downloads
 * are exactly the tiles the live map requests.
 */
export const TOUR_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export function getTourMapStyle() {
  return TOUR_MAP_STYLE_URL;
}

/**
 * Inline style object for the LIVE map. Passing an object (not a URL) to
 * `<Map mapStyle={...}>` makes MapLibre load the style document **inline** — no
 * network fetch for the style doc. This is the fix for the footprint appearing
 * only "after 3–4 restarts": previously the live map fetched a remote style URL,
 * and offline/cold-start that fetch stalled or failed (`onDidFailLoadingMap`), so
 * the base style never finished loading and the GeoJSON footprint overlays (which
 * only attach after the style loads) never rendered. With an inline style the map
 * finishes loading immediately and the overlays attach; vector tiles still come
 * from the offline pack's cache of `/planet`.
 *
 * Typed via a cast because the maplibre-gl-style-spec literal unions reject a
 * hand-written object literal; the shape is validated by style.test.ts and by
 * MapLibre at runtime.
 */
export function getTourMapStyleObject(): StyleSpecification {
  return {
    version: 8,
    name: "Aurelia Tourism",
    sources: {
      openfreemap: {
        type: "vector",
        url: OPENFREEMAP_SOURCE_URL,
      },
    },
    sprite: "https://tiles.openfreemap.org/sprites/ofm_f384/ofm",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#1c1917" },
      },
      {
        id: "landuse-park",
        type: "fill",
        source: "openfreemap",
        "source-layer": "landuse",
        filter: ["==", "class", "park"],
        paint: { "fill-color": "#292524", "fill-opacity": 0.6 },
      },
      {
        id: "water",
        type: "fill",
        source: "openfreemap",
        "source-layer": "water",
        paint: { "fill-color": "#0f172a" },
      },
      {
        id: "roads-minor",
        type: "line",
        source: "openfreemap",
        "source-layer": "transportation",
        filter: ["in", "class", "path", "track", "service", "minor"],
        paint: { "line-color": "#44403c", "line-width": 1 },
      },
      {
        id: "roads-major",
        type: "line",
        source: "openfreemap",
        "source-layer": "transportation",
        filter: ["in", "class", "primary", "secondary", "tertiary", "trunk"],
        paint: { "line-color": "#57534e", "line-width": 2 },
      },
      {
        id: "buildings",
        type: "fill",
        source: "openfreemap",
        "source-layer": "building",
        paint: { "fill-color": "#292524", "fill-opacity": 0.35 },
      },
      {
        id: "place-labels",
        type: "symbol",
        source: "openfreemap",
        "source-layer": "place",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#d6d3d1",
          "text-halo-color": "#1c1917",
          "text-halo-width": 1,
        },
      },
    ],
  } as unknown as StyleSpecification;
}

/**
 * Minimal always-valid fallback style: a solid background + the vector source,
 * with **no sprite/glyph dependency**. Used as the last auto-retry attempt if the
 * primary style ever fails to attach, so the footprint/route/stop overlays can
 * still render on a plain background fully offline.
 */
export function getFallbackMapStyleObject(): StyleSpecification {
  return {
    version: 8,
    name: "Aurelia Fallback",
    sources: {
      openfreemap: {
        type: "vector",
        url: OPENFREEMAP_SOURCE_URL,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#1c1917" },
      },
      {
        id: "water",
        type: "fill",
        source: "openfreemap",
        "source-layer": "water",
        paint: { "fill-color": "#0f172a" },
      },
      {
        id: "roads-major",
        type: "line",
        source: "openfreemap",
        "source-layer": "transportation",
        paint: { "line-color": "#57534e", "line-width": 2 },
      },
    ],
  } as unknown as StyleSpecification;
}

export function getTourMapPackName(tourId: string) {
  return `aurelia-tour-${tourId}`;
}
