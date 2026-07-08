@AGENTS.md

# Aurelia — Project Source of Truth

> Single source of truth for architecture, feature status, known issues, decisions, and history.
> **Read this before starting any task; update it after completing any task.** Treat it as the
> project's persistent memory.

**Status legend:** ✅ Completed · 🚧 In Progress · ⚠️ Known Issue · ⏳ Pending · ❌ Not Started

Last updated: **2026-07-08**

---

## 1. Project Architecture

**Mobile app (`aurelia-app`)** — offline-first walking-tour guide.
- **Runtime:** Expo **SDK 57**, React Native 0.86, React 19.2. Requires a **dev build / APK**
  (uses native modules; Expo Go cannot load the offline map). Package: `com.rajiul.aureliaapp`.
- **Routing:** `expo-router` (typed routes). Tour nav screen: [src/app/tour/[tourId]/nav.tsx](src/app/tour/[tourId]/nav.tsx).
- **Maps:** `@maplibre/maplibre-react-native` v11 (`<Map>` + `<GeoJSONSource>`/`<Layer>` API).
- **State/data:** Zustand stores + TanStack Query (`@tanstack/react-query`). Styling: NativeWind.
- **Offline model:** a downloaded tour is installed to disk — `content.json` (tour + route +
  footprint geometry), encrypted media (`media/*.enc` + `media-map.json`), and a **MapLibre
  offline tile pack**. Nav data is read from disk, not the network.
- **Geo/nav libs:** `@turf/*` (bearing, distance, nearest-point-on-line, length), `expo-location`,
  `expo-speech` (TTS), `expo-audio` (recorded narration), `@shopify/react-native-skia` (footprint).

**Backend (`admin-and-server-aurelia`, separate working dir)** — Next.js API + admin.
- Prisma with **`@prisma/adapter-pg` (`PrismaPg`)** → **Neon serverless Postgres**
  ([src/lib/prisma.ts](../admin-and-server-aurelia/src/lib/prisma.ts)).
- Mobile endpoints under `/api/v1/app/*`; every request runs `requireCompatibleApiVersion` →
  `appReleaseRepository.getConfig()`.

**Two working directories:** `aurelia-app` (this repo) and `admin-and-server-aurelia`.

---

## 2. Completed (✅)

- ✅ **Offline map pack always built on download** — offline pack creation decoupled from the
  `enableGpsNavigation` remote flag; runs for every download, non-fatal on failure.
  [src/lib/bundle/install.ts](src/lib/bundle/install.ts)
- ✅ **Offline route footprints** — built from local `content.json` `route.edges[].footprintGeo`
  with a straight-line fallback; never network-fetched.
  [src/lib/navigation/route-geometry.ts](src/lib/navigation/route-geometry.ts)
- ✅ **Offline navigation session** — GPS gate decoupled from `enableGpsNavigation`; navigation runs
  for any installed tour with usable geo data.
  [src/hooks/use-navigation-session.ts](src/hooks/use-navigation-session.ts)
- ✅ **Offline tiles/style + glyph caching, widened zoom 12–17** — pack caches style/glyphs/sprites/
  tiles; zoom range widened so fit/follow always hit cached tiles.
  [src/types/map-pack.ts](src/types/map-pack.ts), [src/lib/map/offline-pack.ts](src/lib/map/offline-pack.ts)
- ✅ **User live-location marker** — accuracy halo + gold dot + rotating Skia footprint, EMA-smoothed
  `displayLocation`/`displayBearing`, camera auto-follow.
  [src/components/navigation/tour-map-view.tsx](src/components/navigation/tour-map-view.tsx)
- ✅ **Route ordering** — edge-traversal order, `sortOrder` fallback.
  [src/lib/bundle/route-order.ts](src/lib/bundle/route-order.ts)
- ✅ **Teardrop stop pins** — burgundy pin-shaped `Marker` (native RN view) per spot-with-coordinates,
  anchored at its lat/lng above the footprint line; number rendered as **RN `<Text>`** (no MapLibre
  glyphs → offline-safe). [src/components/navigation/stop-pin.tsx](src/components/navigation/stop-pin.tsx)
- ✅ **Start-point pin** — stop "1" emphasized (larger head, brand-gold ring).
- ✅ **Stop pin tap → popup → detail** — tapping a pin opens a `StopCallout` popup (numbered badge +
  localized stop name + **"View Details"**); "View Details" routes to `/tour/{tourId}/spot/{spotId}`.
  Tapping the map/close dismisses it. All client-side/offline.
  [src/components/navigation/stop-callout.tsx](src/components/navigation/stop-callout.tsx),
  [src/components/navigation/tour-map-view.tsx](src/components/navigation/tour-map-view.tsx)
- ✅ **Refresh button** — remounts the map (rebuilds all layers), invalidates installed-content query,
  restarts nav session, rebuilds the pack if incomplete.
  [src/app/tour/[tourId]/nav.tsx](src/app/tour/[tourId]/nav.tsx)
- ✅ **Live device-heading compass** — N/E/S/W ring + heading needle via `expo-location`
  `watchHeadingAsync` (no new native dep).
  [src/hooks/use-device-heading.ts](src/hooks/use-device-heading.ts),
  [src/components/navigation/compass-overlay.tsx](src/components/navigation/compass-overlay.tsx)
- ✅ **Voice guidance** — off-route TTS + approach recorded-audio (pre-existing) **+ new arrival TTS**
  ("You have arrived…", en/es/fr, de-duped per stop). Gated by `enableVoiceGuidance` (default **true**).
  [src/lib/navigation/arrival-voice.ts](src/lib/navigation/arrival-voice.ts),
  [src/hooks/use-navigation-session.ts](src/hooks/use-navigation-session.ts)
- ✅ **Performance** — react-query `networkMode: "offlineFirst"`; map lazy-loaded; feature builders
  memoized. [src/lib/query/client.ts](src/lib/query/client.ts)
- ✅ **Full-screen splash screen** — `splash-icon.png` shown edge-to-edge (`resizeMode="cover"`) via a
  JS overlay held until offline bootstrap (fonts + all store hydration) completes, with a min-display
  time (900 ms) and a fade-out; native splash (`app.json` `resizeMode: "cover"`, dark `#0c0a09` bg)
  hands off seamlessly (no white/black flash). Bootstrap owns hydration and gates readiness.
  [src/components/animated-splash.tsx](src/components/animated-splash.tsx),
  [src/hooks/use-app-bootstrap.ts](src/hooks/use-app-bootstrap.ts),
  [src/app/_layout.tsx](src/app/_layout.tsx)
- ✅ **Backend Neon cold-start resilience** — `withDbRetry`/`isTransientDbError`, applied to
  `getConfig()`, plus 503 classification in the API error handler.
  [prisma-retry.ts](../admin-and-server-aurelia/src/lib/prisma-retry.ts),
  [handler.ts](../admin-and-server-aurelia/src/lib/api/handler.ts),
  [app-release.repository.ts](../admin-and-server-aurelia/src/lib/app-release/app-release.repository.ts)

---

## 3. In Progress (🚧)

- None active. **Note:** all changes above are in the working tree and **not committed**.

---

## 4. Known Issues (⚠️)

- ⚠️ **A single stop missing coordinates blanks the whole map.** `canNavigate` →
  `hasNavigationGeoData` → `hasCompleteSpotCoordinates` uses `.every()`, so one null-coord spot shows
  the "unavailable" fallback (no map, footprints, or markers).
  [src/lib/navigation/validate-geo.ts](src/lib/navigation/validate-geo.ts)
- ✅→⚠️ **Stop numbers no longer depend on glyphs** — they're now RN `<Text>` inside pin `Marker`s, so
  they render offline regardless of glyph caching. **However**, the base "liberty" style's own
  place-name labels still request glyphs, and the Metro log shows `Failed to load glyph range 0-255 …
  (HTTP 404)` — so base-map text labels may be missing offline (and even online if the glyphs endpoint
  404s). Not blocking for stop pins/footprints; verify base-label expectations on-device.
- ⚠️ **Hardware verification pending.** The emulator has no magnetometer or real GPS movement, and
  downloading a tour bundle needs the backend/auth flow — so offline rendering, compass rotation, and
  arrival voice are code-verified but not visually confirmed on-device.
- ⚠️ **Backend intermittent 500s = Neon cold starts.** Neon compute scales to zero after idle; the
  first request can fail with `XX000 "Control plane request failed"`. Now retried → transparent.
  **Frequent** 500s instead point to a **suspended Neon project (quota/billing)** — check the Neon
  dashboard, not the app code.

---

## 5. Pending / Future (⏳)

- ⏳ **Decouple map *display* from the GPS navigation gate** so footprints + valid markers render even
  when some stops have invalid coordinates (addresses issue #4.1).
- ⏳ Continue improving offline load speed.
- ⏳ Verify all offline features on a physical device (Airplane-Mode walk-through).
- ⏳ Consider extending `withDbRetry` to other mobile read endpoints (catalog, tour-detail, download).

---

## 6. Technical Decisions (and why)

- **Always build the offline pack on download** — reliability: gating it behind a remote flag meant
  tours downloaded with the flag off had no tiles and rendered blank offline.
- **Compass via `expo-location` `watchHeadingAsync`** (not `expo-sensors`) — no new native dependency,
  so **no `expo run:android` rebuild** is required; works offline.
- **Arrival announcement via TTS** — fully offline, localized, no bundled audio asset needed; reuses
  the existing `expo-speech` pattern.
- **react-query `offlineFirst`** — disk-backed queries resolve immediately offline instead of being
  paused/retried by the default `online` network mode.
- **Retry only idempotent DB operations** — `withDbRetry` wraps reads / id-keyed upserts; never
  non-idempotent writes (avoids double execution).

---

## 7. Do Not Change Without Consideration

- **`@AGENTS.md` import on line 1 of this file** — injects the "Expo v57 docs" guardrail.
- **MapLibre style URL and offline-pack zoom range must stay in sync** — pack creation and live
  rendering must use the same `getTourMapStyle()`; mismatched zoom → blank offline tiles.
- **Footprint geometry stays local** — read from `content.json`; never re-introduce a network fetch on
  the render path.
- **`withDbRetry` stays limited to idempotent operations** — do not wrap arbitrary route handlers or
  writes with it.

---

## 8. Testing & Verification Status

- ✅ TypeScript `tsc --noEmit` clean — both `aurelia-app` and `admin-and-server-aurelia`.
- ✅ Unit tests **14/14 pass** (`pnpm test`, aurelia-app).
- ✅ Lint — no new errors introduced (diffed against baseline).
- ✅ Android dev build installed on emulator; **Metro bundles all 2144 modules** (no resolve/syntax
  errors).
- ✅ Backend: the previously-500ing `/api/v1/app/catalog/tours` now returns **401** (expected auth gate
  for a credential-less request) — i.e. the DB path succeeds; live DB connect verified (~459 ms).
- ⏳ On-device visual/offline verification pending (see Known Issues).

---

## 9. Offline Functionality Status

| Area | Status | Notes |
|------|--------|-------|
| Route footprints | ✅ | Local `content.json`; straight-line fallback; renders once base tiles load offline |
| Stop pins (teardrop) | ✅ | RN `Marker` per spot-with-coords at its lat/lng, above the route; null-coord spots skipped (#4.1) |
| Start point "1" + numbering | ✅ | Emphasized start pin; numbers are RN text (glyph-independent) |
| Stop pin tap → popup → detail | ✅ | Popup (name + View Details) → `/tour/{tourId}/spot/{spotId}` |
| User live location | ✅ | Smoothed marker, camera follow |
| Base tiles/style offline | ✅ | Pack always built; zoom 12–17; on-device verification pending |

---

## 10. Navigation & Map Implementation Details

- **Screen:** [nav.tsx](src/app/tour/[tourId]/nav.tsx) lazy-loads `TourMapView`, computes
  `orderedSpots` via `orderSpotsByRoute`, drives the nav session, overlays (back, refresh, compass,
  title, distance, off-route banner, stop-list button).
- **Map render tree (draw order) in [tour-map-view.tsx](src/components/navigation/tour-map-view.tsx):**
  walk-trail line → walk-trail steps → completed route → upcoming route → stop markers (circles +
  number labels, tappable) → user position (halo + dot) → Skia `FootprintOverlay`.
- **Data flow:** `useInstalledTourView(tourId)` → `content` → `orderSpotsByRoute` /
  `buildRouteCoordinates` → `splitRouteAtIndex`; live GPS via `useNavigationSession` produces a
  `snapshot` (`displayLocation`, `displayBearing`, `proximity`, `status`, `walkTrail`).
- **Thresholds:** approach 40 m, arrival 20 m, dwell 30 m/10 s, off-route 10 m — `DEFAULT_NAVIGATION_
  THRESHOLDS` in [src/lib/navigation/types.ts](src/lib/navigation/types.ts).

---

## 11. Assumptions & Limitations

- Tour authoring (Admin) must provide **accurate coordinates and route edges**; the client cannot
  correct bad source geometry.
- The Android **emulator cannot validate** the magnetometer compass or real GPS movement.
- All current changes are **uncommitted** working-tree edits across both repos.

---

## 12. Changelog

- **2026-07-08** — **Fixed expo-blur tab-bar warning** (aurelia-app): removed
  `blurMethod="dimezisBlurView"` from the `GlassTabBar` `BlurView`
  ([glass-tab-bar.tsx](src/components/navigation/glass-tab-bar.tsx)). In expo-blur v57 that method
  needs a `blurTarget` ref (unavailable to a floating tab bar), so it only logged "…fallback to none…"
  and never actually blurred on Android. Android now renders a plain translucent surface (opaque
  ~0.92 fill for legibility); iOS keeps its real native blur. No more console warning.
- **2026-07-08** — **Full-screen splash screen** (aurelia-app): added `AnimatedSplash` (edge-to-edge
  cover image + fade) and `useAppBootstrap` (fonts + all store hydration → `ready`, with a 900 ms
  minimum display). `_layout.tsx` renders the app when ready and overlays the splash; hydration moved
  out of `AppProviders`. Native splash set to `resizeMode: "cover"` (**needs a native rebuild** —
  `npx expo run:android` — to take effect; JS overlay works without one). **Dev-env note:** on-device
  visual verification was blocked because the emulator's expo-dev-client kept serving a stale
  device-cached bundle on adb-driven launches (a fresh reload needs the in-app dev menu, or `adb
  reverse tcp:8081 tcp:8081` + a real reload). Verified statically (tsc/lint/tests).
- **2026-07-08** — **Teardrop stop pins + tap popup** (aurelia-app): replaced the flat GeoJSON
  circle/symbol stop markers with burgundy pin-shaped `Marker` views
  ([stop-pin.tsx](src/components/navigation/stop-pin.tsx)); tapping a pin opens a `StopCallout` popup
  ([stop-callout.tsx](src/components/navigation/stop-callout.tsx)) with the localized stop name + a
  "View Details" button that navigates to the spot detail page. Numbers are now RN text, removing the
  offline-glyph dependency for stop labels (base-style place labels still glyph-dependent — 404 seen
  in logs). `nav.viewDetails` string added (en/es/fr).
- **2026-07-08** — Offline map & navigation overhaul (aurelia-app): decoupled offline pack + nav from
  `enableGpsNavigation`; widened offline zoom to 12–17; added map-load-failure handler; Refresh
  button; `offlineFirst` query mode; arrival-voice TTS (en/es/fr); live device-heading compass;
  emphasized numbered start marker.
- **2026-07-08** — Offline map audit + **tappable stop markers** (`GeoJSONSource.onPress` → spot
  detail). Documented the `canNavigate` coordinate-gate and offline-glyph known issues.
- **2026-07-08** — Backend (admin-and-server-aurelia): diagnosed intermittent mobile 500s as **Neon
  serverless cold starts** (`XX000 Control plane request failed`); added `withDbRetry`/
  `isTransientDbError`, applied to `getConfig()`, and 503 classification in the API error handler.
