@AGENTS.md

# Aurelia — Project Source of Truth

> Single source of truth for architecture, feature status, known issues, decisions, and history.
> **Read this before starting any task; update it after completing any task.** Treat it as the
> project's persistent memory.

**Status legend:** ✅ Completed · 🚧 In Progress · ⚠️ Known Issue · ⏳ Pending · ❌ Not Started

Last updated: **2026-07-16**

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

- ✅ **Offline access layer — a downloaded tour opens with ZERO API calls.** Previously every tour
  screen sat behind [tour/[tourId]/_layout.tsx](src/app/tour/[tourId]/_layout.tsx) →
  `useEntitlementStatus()` → `useEntitlements()`, a **live API call** cached only in react-query
  *memory* (no persister), plus a per-foreground `invalidateQueries` — so access had to be re-fetched
  on every cold start, and `expiresAt` was never stored on device. Now: entitlements are persisted to
  disk as a **snapshot** (`aurelia/entitlements.json`) and hydrated at bootstrap; the entitlements
  query is **disabled while the snapshot is unexpired**, so launching, foregrounding, or opening a
  downloaded tour issues no request. The network is only touched at sign-in, purchase, an explicit
  user refresh, or once the snapshot's window has expired — all via `refreshEntitlements()`
  (`invalidateQueries` cannot refetch a disabled query).
  [src/store/entitlements-store.ts](src/store/entitlements-store.ts),
  [src/lib/entitlements/access.ts](src/lib/entitlements/access.ts),
  [src/lib/entitlements/refresh.ts](src/lib/entitlements/refresh.ts),
  [src/hooks/queries/use-entitlements.ts](src/hooks/queries/use-entitlements.ts),
  [src/hooks/use-entitlement-status.ts](src/hooks/use-entitlement-status.ts)
- ✅ **Offline access expiry — lock, then sweep.** `bundle-meta.json` now carries `accessExpiresAt`
  (stamped from the snapshot at install), so each bundle knows its own access window without any
  in-memory state. An expired tour locks immediately via the existing `TourAccessLockScreen`
  (decision is local ⇒ works offline) and is deleted — bundle + media + map pack — by a sweep that
  runs **once per app process** on cold start, giving the user a session to renew before the download
  disappears. [src/lib/bundle/expiry.ts](src/lib/bundle/expiry.ts),
  [src/components/installed-tours-rehydrate-listener.tsx](src/components/installed-tours-rehydrate-listener.tsx),
  [src/lib/bundle/install.ts](src/lib/bundle/install.ts)
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
- ✅ **Offline tour = on-disk bundle is the source of truth — fixes "offline shows 'download the tour'"**
  — the per-tour screens (index/nav/spot/installed-guide-card) previously gated content on the
  **in-memory** installed-tours store (`useInstalledTourContent`/`useInstalledMediaMap` had
  `enabled: Boolean(tourId && bundleId)`, and `useInstalledTourView` read `preferences` from the store).
  So if that store wasn't populated on a cold **offline** launch (hydration reject/race/eviction), a
  fully-downloaded tour on disk showed **"not installed / download"**. Now the queries are gated on
  `tourId` only and load content **+** preferences directly from disk (`loadInstalledTour` reads
  `content.json` + `bundle-meta.json`); the in-memory store is only a fallback / cache-buster. Also
  hardened `installedToursStore.hydrate()` so a disk hiccup can never silently leave it empty.
  [src/lib/bundle/load.ts](src/lib/bundle/load.ts),
  [src/hooks/use-installed-tour-view.ts](src/hooks/use-installed-tour-view.ts),
  [src/hooks/queries/use-installed-tour-content.ts](src/hooks/queries/use-installed-tour-content.ts),
  [src/store/installed-tours-store.ts](src/store/installed-tours-store.ts)
- ✅ **Inline (local) map style — fixes "footprint appears only after 3–4 restarts"** — the live
  `<Map>` now loads an **inline style object** (`getTourMapStyleObject()`) instead of a remote style
  URL, so MapLibre needs **no network fetch for the style document**; the base style finishes loading
  immediately and the footprint/route GeoJSON overlays (which only attach after the style loads) render
  on the first open, offline. Vector tiles still come from the offline pack's cache of `/planet`. Adds:
  a glyph/sprite-free **fallback style** + **bounded auto-retry** on `onDidFailLoadingMap` (remount, last
  attempt uses the fallback) so a transient failure self-recovers without an app restart; and a
  **pack warm-up effect** on the nav screen that builds the tile pack in the background if not yet ready.
  [src/lib/map/style.ts](src/lib/map/style.ts),
  [src/components/navigation/tour-map-view.tsx](src/components/navigation/tour-map-view.tsx),
  [src/app/tour/[tourId]/nav.tsx](src/app/tour/[tourId]/nav.tsx)
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
- ✅ **Floor cards lock after sign-out.** Signed-out users can still see downloaded floor cards on
  Home (offline covers stay on disk) but each card is **Locked** (lock icon + Locked chip) and taps
  route to Unlock (`/explore`). Opening any `/tour/[tourId]/…` deep link hits the tour layout
  gate with reason `signed_out` → `TourAccessLockScreen`. Previously `getTourLockReason` returned
  `null` when signed out (fail-open), so logout did not seal content.
  [src/hooks/use-entitlement-status.ts](src/hooks/use-entitlement-status.ts),
  [src/components/tours/floor-card.tsx](src/components/tours/floor-card.tsx),
  [src/components/tours/tour-floor-cards.tsx](src/components/tours/tour-floor-cards.tsx)

---

## 3. In Progress (🚧)

- None active. **Note:** all changes above are in the working tree and **not committed**.

---

## 4. Known Issues (⚠️)

- ⚠️ **In-app Stripe purchase now fails for a phone-only buyer.** Buyers are identified by phone and
  carry no email, but Stripe needs one for the receipt — the server rejects a checkout without one
  (*"An email address is required to complete the purchase."*). The **subscribe screen must collect an
  email** and pass it in the checkout payload (the server already accepts an optional `email` and writes
  it back onto the grant on payment). Until then, selling happens through the admin panel, which is the
  intended flow. [src/app/subscribe.tsx](src/app/subscribe.tsx)

- ⚠️ **A single stop missing coordinates blanks the whole map.** `canNavigate` →
  `hasNavigationGeoData` → `hasCompleteSpotCoordinates` uses `.every()`, so one null-coord spot shows
  the "unavailable" fallback (no map, footprints, or markers).
  [src/lib/navigation/validate-geo.ts](src/lib/navigation/validate-geo.ts)
- ✅ **~~Footprint appears only after 3–4 app restarts~~ FIXED** — root cause was the live `<Map>`
  loading a **remote style URL**, whose style-document fetch stalled/failed offline so the base style
  never finished loading and the footprint overlay (attaches only after style load) never rendered until
  MapLibre's ambient cache warmed across restarts. Fixed by loading an **inline style object** (no doc
  fetch) + fallback style + auto-retry + pack warm-up (see §2). Verify on-device (Airplane-Mode).
- ✅→⚠️ **Stop numbers no longer depend on glyphs** — they're now RN `<Text>` inside pin `Marker`s, so
  they render offline regardless of glyph caching. **However**, the base style's own place-name labels
  (`place-labels` symbol layer) still request glyphs, and the Metro log shows `Failed to load glyph
  range 0-255 … (HTTP 404)` — so base-map text labels may be missing offline. Not blocking for stop
  pins/footprints (the inline-style fix makes the map load regardless); to fully silence it, bundle
  local fonts/sprite or drop the `place-labels` layer. Verify base-label expectations on-device.
- ⚠️ **Hardware verification pending.** The emulator has no magnetometer or real GPS movement, and
  downloading a tour bundle needs the backend/auth flow — so offline rendering, compass rotation, and
  arrival voice are code-verified but not visually confirmed on-device.
- ⚠️ **Network-silence claim is code-verified, not device-verified.** No screen on the downloaded-tour
  path (`_layout` → index → spot → nav) imports a service or `apiClient`, and the entitlements query is
  disabled while the snapshot is valid — but the acceptance test is still to watch the network log on a
  device: download → kill app → relaunch → open tour → open nav must produce **zero** `/api/v1/app/*`
  requests. Note the browsing surfaces (home catalog, app content, release-config/knowledge sync) do
  still call the API on launch — that is by design, they are online screens.
- ⚠️ **Backend intermittent 500s = Neon cold starts.** Neon compute scales to zero after idle; the
  first request can fail with `XX000 "Control plane request failed"`. Now retried → transparent.
  **Frequent** 500s instead point to a **suspended Neon project (quota/billing)** — check the Neon
  dashboard, not the app code.

---

## 5. Pending / Future (⏳)

**Multi-floor, remaining:**
- ✅ **Floor switcher wired** and ✅ **floor names + cover images ship in the bundle** (2026-07-15).
- ✅ **Floor cards on the home screen** and ✅ **`hasActivePlan` predicate** (2026-07-15).
- ✅ **Locked floor preview** — catalog `/catalog/tours` ships `floors[]`; Home shows Locked
  floor cards for non-installed tours and for signed-out users with installs (2026-07-15).
- ⏳ **Server does not send `spot.floorId`** — only `floor` (the number), so mobile matches spots to
  floors by number. Emitting `floorId` from `toTourDto` would make the match exact (one line, additive).

**Other:**
- ⏳ **Decouple map *display* from the GPS navigation gate** so footprints + valid markers render even
  when some stops have invalid coordinates (addresses issue #4.1).
- ⏳ Continue improving offline load speed.
- ⏳ Verify all offline features on a physical device (Airplane-Mode walk-through).
- ⏳ Consider extending `withDbRetry` to other mobile read endpoints (catalog, tour-detail, download).

---

## 6. Technical Decisions (and why)

- **Entitlements are snapshot-first, not query-first** — "does this device have access?" must be
  answerable with the radio off. The persisted snapshot is the source of truth and the query exists
  only to create or renew it. Consequence to remember: **the entitlements query is disabled while the
  snapshot is valid, and a disabled query is never refetched by `invalidateQueries`** — any code that
  needs fresh entitlements must call `refreshEntitlements()`.
- **Each bundle stamps its own `accessExpiresAt`** — so expiry survives losing the snapshot and never
  depends on store hydration. The *current* snapshot still wins when present (a renewal extends a
  bundle stamped with an older expiry; a revoked tour expires even if its stamp hasn't run out).
  With neither date known a tour is **not** expired — never delete a user's content on missing data.
- **Expiry sweep runs once per process, not per foreground** — so a tour that expires mid-session
  locks (a live, local check) and is only removed on the next launch.

- **Always build the offline pack on download** — reliability: gating it behind a remote flag meant
  tours downloaded with the flag off had no tiles and rendered blank offline.
- **Compass via `expo-location` `watchHeadingAsync`** (not `expo-sensors`) — no new native dependency,
  so **no `expo run:android` rebuild** is required; works offline.
- **Arrival announcement via TTS** — fully offline, localized, no bundled audio asset needed; reuses
  the existing `expo-speech` pattern.
- **react-query `offlineFirst`** — disk-backed queries resolve immediately offline instead of being
  paused/retried by the default `online` network mode.
- **On-disk bundle is the source of truth for offline availability** — "is this tour installed?" is
  answered by the presence of `content.json`/`bundle-meta.json` on disk, not by the in-memory Zustand
  store. Per-tour queries gate on `tourId` and read from disk; the store is a convenience/cache only.
  This is required for an offline-first app: a downloaded tour must open with zero dependence on network
  or on any in-memory state surviving a cold launch.
- **Inline map style object for the live map** — passing a `StyleSpecification` object (not a URL) to
  `<Map mapStyle={...}>` removes the remote **style-document** fetch, the single biggest cause of blank/
  delayed offline maps. The overlay layers (footprint, pins) can only attach after the base style loads,
  so making the style load network-free makes the footprint appear immediately. Tiles still come from the
  offline pack. The pack is still created from `getTourMapStyle()` (URL form) because
  `OfflineManager.createPack` needs a URL — both reference the same `/planet` source so caches match.
- **Retry only idempotent DB operations** — `withDbRetry` wraps reads / id-keyed upserts; never
  non-idempotent writes (avoids double execution).

---

## 7. Do Not Change Without Consideration

- **`@AGENTS.md` import on line 1 of this file** — injects the "Expo v57 docs" guardrail.
- **Live style object and offline-pack style must reference the same source + zoom** — the live map uses
  `getTourMapStyleObject()` (inline object, source `openfreemap` → `/planet`); the pack is created from
  `getTourMapStyle()` (URL). Both must point at the **same `/planet` tiles** and the same zoom range
  (`MAP_MIN_ZOOM`/`MAP_MAX_ZOOM`), or the live map requests tiles the pack never cached → blank offline.
- **Footprint geometry stays local** — read from `content.json`; never re-introduce a network fetch on
  the render path.
- **`withDbRetry` stays limited to idempotent operations** — do not wrap arbitrary route handlers or
  writes with it.

---

## 8. Testing & Verification Status

- ✅ TypeScript `tsc --noEmit` clean — both `aurelia-app` and `admin-and-server-aurelia`.
- ✅ Unit tests **69/69 pass** (`pnpm test`, Vitest, aurelia-app) across 13 files — expanded from 14.
  Newest: `src/lib/entitlements/access.test.ts` (expiry / snapshot-usable gate),
  `src/lib/bundle/expiry.test.ts` (lock+sweep rules incl. renewal extending an older stamp), and
  `src/store/entitlements-store.test.ts` (hydrate / persist / clear, storage mocked).
  Zustand store tests, navigation edge cases, **map style** (`src/lib/map/style.test.ts`), and
  **content preferences** (`src/lib/bundle/content-preferences.test.ts`: `resolveTourPreferences` disk-
  over-store precedence, the core offline-fix helper). Backend also has a Vitest suite (**88 tests**) —
  see its CLAUDE.md §10.
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

- **2026-07-16** — **Find-host Map no longer crashes the app.** `HostMapView` still used the old
  MapLibre API (`MapLibre.MapView` / `styleURL` / `MarkerView` / `ShapeSource`) which does not exist
  in `@maplibre/maplibre-react-native` v11 — opening Map native-crashed (ErrorBoundary cannot catch
  it). Rewrote to the same v11 surface as tour nav: `<Map mapStyle={inline}>` + `Marker` +
  `GeoJSONSource`/`Layer`, style retry + fallback, and the map screen now fetches walking directions
  when visitor GPS is ready (throttled to 25 m).
  [host-map-view.tsx](src/components/host/host-map-view.tsx),
  [map.tsx](src/app/find-host/[tourId]/[hostId]/map.tsx). `tsc` clean.

- **2026-07-15** — **Spot Details → floor map.** Title row has a map button (top-right) that opens
  that stop’s floor on the interactive map (`/nav?floorId=…`). Floor is resolved via
  `resolveSpotFloorId` (`floorId`, then floor number, then tour default).
  [spot/[spotId].tsx](src/app/tour/[tourId]/spot/[spotId].tsx),
  [floor-routing.ts](src/lib/bundle/floor-routing.ts).

- **2026-07-15** — **Spot audio player height trimmed.** Immersive controls are now a single
  horizontal row (skip / 40px play / skip + progress + times) instead of a tall stacked block with a
  64px button — Spot Details no longer wastes vertical space on audio.
  [spot-audio-player.tsx](src/components/tours/spot-audio-player.tsx).

- **2026-07-15** — **Home shows Locked floor cards again (not tour cards).** Catalog
  `/catalog/tours` now returns each tour’s `floors[]` (id, name, cover, stopCount).
  Home renders those as Locked `FloorCard`s when the tour isn’t installed, plus
  real installed floor cards (also Locked when signed out). Tour-level cover
  teasers stay gone.

- **2026-07-15** — **Home floor cards stay Locked while signed out.** Installed
  floors force-lock when there is no session; visitors with no download still
  see locked catalog teasers that route to Unlock. Tap never opens floor content
  until signed in with access.

- **2026-07-15** — **Settings cards are glassified.** New reusable
  [`GlassCard`](src/components/ui/glass-card.tsx) (Liquid Glass / iOS blur /
  Android translucent tint) wraps all Settings panels so they read as frosted
  sheets over the global photo background.

- **2026-07-15** — **Same mobile photo background on every screen.** Home’s
  `resolveAppBackgroundUrl` image (right-cropped, no scrim) now lives once in
  root via [`AppBackground`](src/components/app-background.tsx); Stack/Tabs use
  transparent `contentStyle`/`sceneStyle` and screen `ThemedView`s accept
  `transparent` so the photo shows through Account, Settings, floors, spot,
  etc. Removed per-screen `PageBackground` wrappers on Home / Welcome / Spot.

- **2026-07-15** — **Floor cards lock after logout.** Root cause: `getTourLockReason` /
  `hasTour` fail-opened for signed-out users (`if (!isSignedIn) return null` / `true`), so
  downloaded floors stayed fully explorable with no session. Now signed-out ⇒ lock reason
  `signed_out`; cards show a lock badge + “Locked” chip and send taps to `/explore`; the tour
  layout still blocks deep links with `TourAccessLockScreen`. Unlock + active entitlement for
  that tour still required to enter. `tsc` clean.

- **2026-07-15** — **Dropped unfinished web platform stub.** Product is native-only (no EAS web
  profile; MapLibre/offline GPS tour is not a web target). Deleted Expo-template residue
  `app-tabs.web.tsx`, `external-link.tsx`, `use-color-scheme.web.ts`; removed `expo-symbols`,
  `expo-web-browser`, `react-dom`, `react-native-web`, the `web` script, and `app.json` `web`
  config. Kept defensive `Platform.OS === "web"` branches in secure-storage. NativeWind stack
  still deferred. `tsc` clean.

- **2026-07-15** — **Audit follow-up: deleted leftover dead helpers.** Removed unused
  `tour-navigation.ts` (0 importers: `getTourStopsPath` / deprecated `getContinueTourPath`) and
  unused `spot-media.ts` exports (`spotHasMedia`, deprecated `getSpotAudioMedia` /
  `getSpotHeroImage`). Live callers already use `getSpotMediaByType`. Web / NativeWind decision
  still deferred. `tsc` clean.

- **2026-07-15** — **Dropped unused `mapTileUrl` from bundle floor type.** Server no longer emits it
  (column dropped); `BundleFloor.mapTileUrl` and `getMapTileUrlForFloor` removed. MapLibre still uses
  OpenFreeMap for outdoor GPS — reintroduce a dedicated indoor-tile field only when floor plans are
  rendered. Floor routing / scope tests updated; full suite green.

- **2026-07-15** — **Relevant Ionicons on primary app buttons.** Extended
  `GoldGradientButton` with a leading `icon` prop; wired icons across unlock,
  download/open/update, subscribe, access-lock, map stop-list / go-back, welcome
  Get Started, account sign-out, stop callout View Details, spot prev/next/done,
  settings refresh/remove/theme/language chips, maintenance, and home retry.
  Buttons that already had icons (guided walk, Ask Aurelia, etc.) left as-is.
  `tsc` clean.

- **2026-07-15** — **Floor stop-list "Map Explore" is now a premium cover card.** Replaced the flat
  gold CTA row with the same [`FloorCard`](src/components/tours/floor-card.tsx) language as home
  (cover + scrim + soft shadow + explore chip). Uses the floor's cached cover via
  `useInstalledMediaUri`; `FloorCard` gained optional `subtitle` / `exploreIcon` so the map hint can
  replace the stop-count line. `tsc` clean.

- **2026-07-15** — **Cleanup Batch B: drop `@expo/ui` + compress branding PNGs.** Removed unused
  `@expo/ui` (zero JS imports; was still Expo-autolinked into native builds — a full native rebuild
  is needed for the binary size drop). Losslessly recompressed `assets/images/icon.png`
  (1254→1024 px, **1.0 MB → 645 KB**) and `splash-icon.png` (**1.3 MB → 1.0 MB**) via oxipng; also
  tightened `android-icon-foreground.png`. Web/NativeWind still deferred. `tsc` clean; 110 tests.

- **2026-07-15** — **Batch A dead-code / unused-package cleanup.** Grep-verified removals only (no
  web/NativeWind/Skia cuts). Deleted orphaned UI: `GuidesHubSection`, `InstalledGuideCard`,
  `SpotMediaGallery` (superseded by `SpotVisualMediaGallery`), Expo template leftovers `HintRow` +
  `Collapsible`, and unused `assets/map/aurelia-tourism-style.json` (live map style is inline). Also
  removed orphaned `guideFeature.*` i18n (en/es/fr), `useStrings().guideFeatures`, and
  `constants/guide-features.ts`. Dropped `@turf/turf` (code already uses modular `@turf/*`) and
  unused `prettier-plugin-tailwindcss`. Left alone: `app-tabs.web.tsx` / `external-link.tsx` /
  `expo-symbols` / `expo-web-browser` (web platform resolution), NativeWind stack, `@expo/ui`.
  `tsc` clean; **110** tests pass.

- **2026-07-15** — **Spot Details close button now really goes back.** The top-left X hard-coded
  `router.push('/tour/[tourId]')` — a leftover from when spots were only ever opened from the tour index.
  It always jumped to the all-floors overview (and `push`, so it grew the stack) instead of returning
  where the user came from. Now `router.canGoBack() ? router.back() : router.replace('/tour/[tourId]')`
  — returns to the floor page / map / search result it was opened from, with the index only as a
  no-history (deep-link) fallback. Prev/next use `router.replace`, so the back target stays the opener
  even after paging through spots. The button itself stays (it is the only way to close the page); only
  the stale destination changed. (The footer **"Done"** on the last spot still `push`es to the tour
  index — deliberate "finish → overview", left as-is.) `tsc` clean; 110 tests.

- **2026-07-15** — **Floor card now opens a floor page (list-first), not straight to the map.** New flow:
  Home → Floor card → **floor page** → (Map Explore | Spot List → Spot details). New route
  [tour/[tourId]/floor/[floorId].tsx](src/app/tour/[tourId]/floor/[floorId].tsx): a **"Map Explore" card**
  at the top (opens the existing map view via `/tour/[tourId]/nav?floorId=…` — the map's logic/behaviour
  is untouched, it just receives the floor) and, below it, the **floor-scoped stop list** built from
  `getFloorScope` + `orderSpotsByRoute` so only that floor's spots appear (never another floor's), each
  opening spot details. Home floor cards now route here instead of to `nav`; a v1/single-floor
  whole-tour card routes to the tour index (its all-spots overview). `tsc` clean; 110 tests; lint at
  baseline. (Spot-details prev/next still spans floors — the spec scoped only the *list*.)

- **2026-07-15** — **Floor cover images now actually show (offline-first caching).** The covers reached
  the bundle but never the screen — a two-part gap: (1) [collect-media-urls.ts](src/lib/bundle/collect-media-urls.ts)
  gathered the tour cover and spot media for offline caching but **not floor covers**, so nothing was
  downloaded locally; (2) the floor card and the nav floor switcher pointed `<Image>` at the **remote R2
  url** instead of the cached copy, so on an offline-first app the image had no way to load. Fixed both:
  floor covers are collected in FULL mode, and both `FloorCard` (home) and `FloorSelector` (nav) resolve
  the url through **`useInstalledMediaUri`** (local cached file when present, remote as fallback) — the
  same pattern spot media already used. ⚠️ **Existing installs must re-download** — their on-disk bundle
  predates both the coverUrl and this caching. 3 new tests; `tsc` clean; 110 tests; lint at baseline.

- **2026-07-15** — **Home screen redesigned around floors, gated by an active plan.** Per the product
  spec: no tour cards — the home now shows **one premium card per floor** of each installed tour, and
  tapping a card opens that floor (`/tour/{id}/nav?floorId=…`; `useFloorSelection` honours the deep-link
  floor if it exists in the bundle). New pieces: [`FloorCard`](src/components/tours/floor-card.tsx)
  (cover image + scrim, floor name, stop count, a **compass "Explore" chip** so it reads as openable,
  soft shadow, rounded corners, press-in scale, `FadeInDown` staggered entrance) and
  [`TourFloorCards`](src/components/tours/tour-floor-cards.tsx) (reads the on-disk bundle — no network —
  and renders a card per floor; a v1/single-floor tour gets one whole-tour card).
  - **Gating** uses a real **`hasActivePlan(isSignedIn, entitlements)`** predicate in
    [access.ts](src/lib/entitlements/access.ts) — signed in + `isAccessActive` + at least one tour.
    It is deliberately **not** `isActive` (which is fail-open, `true` when signed out): a Buy-Plan CTA
    gated on `isActive` would hide from exactly the people it targets. The **Buy Plan** button (top) and
    **Why Buy** (bottom) show only when `!hasActivePlan`, on both the home and the Account screen.
  - Tours entitled but not yet downloaded show a compact **download** prompt (not a big cover card), so
    the floor cards stay the visual focus while the download path still works. 4 new `hasActivePlan`
    tests (incl. the fail-open trap); `tsc` clean; 107 tests; lint at baseline.
  - **Dead code (removed 2026-07-15):** `GuidesHubSection` + `InstalledGuideCard` and related orphans
    were deleted in a verified cleanup pass (see changelog).
  - ⏳ **Buy Plan routes to `/explore`** (the Account tab: unlock + subscribe). In-app Stripe is still
    broken for phone-only buyers (§4), so this is really "unlock or contact support" today.

- **2026-07-15** — **Floor cover images + the floor switcher is finally wired.** The server now ships
  each floor's **`coverUrl`** and translated **name** in the v2 bundle (both already typed on
  `BundleFloor`). `FloorSelector` was rewritten — it never compiled before (wrong theme API) — and now
  renders a cover thumbnail + localized name per floor. It is **rendered in the nav screen** at last
  (multi-floor tours only; single-floor returns null), driven by the `useFloorSelection` state that
  Phase 0 already threaded through. So on a multi-floor tour you can now switch floors during the walk,
  and each floor's route/map/spots follow. `tsc` clean; 103 tests passing.

- **2026-07-15** — **Unlock replaces sign-in: phone number + 4-digit PIN.** We never hold the buyer's
  email, so the app no longer signs in with one. The new [UnlockForm](src/components/auth/unlock-form.tsx)
  takes the phone number and the 4-digit PIN the seller sent by hand, posts them to
  `POST /auth/unlock`, and stores the returned session token in SecureStore — **the PIN is asked for
  exactly once per device**, then never again. One step, nothing to send and wait for (the old flow was
  email → send code → wait → type code). The email-OTP path (`SignInForm`, `useRequestOtp`,
  `useVerifyOtp`, `authService.verifyOtp`) is **deleted from the app**; the server keeps the endpoints
  for legacy email-bearing grants, but nothing here calls them.
  - **Errors are shown verbatim from the server**, because it is the only side that knows *why*: a
    wrong PIN and an unknown number deliberately say the same thing, and it also spells out a lockout
    ("too many attempts"), an expiry, a not-yet-active date, and a full device list.
  - **No self device-removal.** `authService.revokeDevice` is gone and sign-out is now **local only** —
    the device keeps its slot on the seller's side. If the buyer could free their own slot, one grant
    could be passed around indefinitely by signing out on each phone.
  - **`useAuthStore.email` → `.phone`** (the SecureStore *key* stays `aurelia.sessionEmail`: renaming it
    would strand the identity of anyone who already unlocked). `Entitlements.ticketCount` → `maxDevices`,
    and it now carries `phone` + `activatedAt`.
  - **The home greeting lost its name.** It was derived from the email's local part
    ("rajiul@…" → "Rajiul"); a phone number has no name in it, and we never collect one, so the greeting
    is now the time of day alone — "Good morning, +8801712345678" would be worse than no name.
  - `tsc --noEmit` clean; 100 tests passing; lint at baseline.
  - ⚠️ **In-app Stripe purchase is broken for phone-only buyers** — see §4.

- **2026-07-15** — **Mobile reads v2 (per-floor) bundles; the silently-lost route is fixed.** The server
  has been shipping **v2** bundles for a while (`content.floors[]`, each floor owning its route — there
  is no top-level `content.route` any more), while mobile still read `content.route` in **nine** places.
  That field is now `undefined`, and every consumer degraded *quietly* instead of throwing:
  `buildRouteCoordinates`/`orderSpotsByRoute` fall back to spot `sortOrder` when handed no route, so the
  map drew a **straight line through the stops with no footprint geometry**, off-route detection ran
  against that fake line, and the stop order was whatever `sortOrder` said rather than what the route
  said. Nothing crashed, which is why it went unnoticed. Fixed by resolving spots+route through the floor:
  `getFloorScope(content, floorId?)` in [floor-routing.ts](src/lib/bundle/floor-routing.ts) (omitting the
  floor means the first/only one, so v1 bundles and single-floor tours are unaffected), plus
  `getAllFloorScopes`/`getAllRoutes`. `validate-geo`, `readiness`, `route-geometry`, `use-navigation-session`
  and `TourMapView` now all take an optional `floorId`; `nav.tsx` owns the active floor via
  `useFloorSelection` and passes it to the session and the map — so the **Phase-2 floor switcher is a
  UI-only change**. Two scopes are deliberately different: the walk is **per floor**, while the stop list
  and a spot's prev/next arrows **cross floors** (`orderSpotsAcrossFloors`), and the **offline map pack
  covers every floor** (`buildNavigationMeta` aggregates all of them — floor-1-only bounds would crop
  floor 2 out of the downloaded map). Also fixed `floor-selector.tsx`, which never compiled (10 TS errors
  — it used a `theme.colors.*` / `Spacing.md` API that does not exist). **Note:** the server sends spots
  with `floor` (the number) and **no `floorId`** ([tour.mapper.ts:126](../admin-and-server-aurelia/src/modules/tour/tour.mapper.ts#L126)),
  and the builder drops floor names — so spot→floor matching falls back to the floor number, and floors
  label as "Floor N". Both are covered by tests written against the **real** payload shape. 18 new tests;
  `tsc --noEmit` clean; 100 tests passing.

- **2026-07-14** — **Floor model + multi-floor tour architecture planned (backend + mobile).** Backend
  designed `Tour → Floor → Spot` structure for indoor multi-level tours (Colosseum 4 floors). Each
  floor has its own map, route, and spots. Mobile side: complete audit done (40 files identified).
  Good news: `floor: number` already exists in `BundleSpot` type but **unused**. Implementation will add:
  (1) Floor field validation on bundle load, (2) Optional floor selector UI on nav screen, (3) Floor-aware
  spot grouping/filtering, (4) Per-floor map switching. All backward-compatible. Roadmap: admin floor
  CRUD → bundle builder update → mobile floor UI. ⏳ Implementation pending.

- **2026-07-13** — **Offline-first access layer: downloaded tour = zero API calls; local expiry.** The
  "already downloaded but says *download the tour*" report had a second root cause beyond the content
  read path: **access** was network-only. Every tour screen was gated on a live entitlements query held
  in react-query memory (no persister) and re-invalidated on every foreground, and `expiresAt` was never
  written to the device — so nothing about access could be decided offline. Fixed by persisting an
  entitlements **snapshot** to disk (hydrated in `useAppBootstrap`), disabling the query while that
  snapshot is unexpired, deleting the per-foreground refresh listener, and routing the legitimate
  refresh moments (sign-in, purchase, explicit refresh) through `refreshEntitlements()`. Added
  `accessExpiresAt` to `bundle-meta.json` + an expiry sweep (lock immediately, delete on next launch).
  Also closed the two remaining disk-read holes: `readJsonFile` no longer short-circuits its retry loop
  on a transient `!file.exists`, and the installed-content query no longer limits retries based on the
  in-memory store. Spot detail now uses `useCachedAppContent()` (cache-only) so it cannot fire a request
  on the tour path. Vitest 51→**69**; `tsc` clean; no new lint errors. ⚠️ On-device network-silence
  verification still pending (see §4).

- **2026-07-12** — **Hardened the offline "not installed" path further** (follow-up to 2026-07-11, which
  was still reported failing on a release APK). Remaining hole: `useInstalledTourView` returned `null`
  content whenever `preferences` was `null`, and preferences live **only** in `bundle-meta.json` — so a
  tour whose `content.json` is on disk but whose meta is missing/corrupt (interrupted install: meta is
  written **last**, after map-pack + media caching) still rendered "Tour not installed offline". Added
  `fallbackTourPreferences(language)` (default audience, app locale, **FULL** mode so nothing is filtered
  out); the view now falls back to it whenever content is on disk. Vitest 49→**51**, `tsc` clean.
  ⚠️ Still unverified on-device — note a release APK built via `gradlew assembleRelease` bundles the JS
  present on disk **at build time**, so the 2026-07-11 fix only ships if the APK was rebuilt after it.
- **2026-07-11** — **Fixed "offline shows 'download the tour'" for an already-downloaded tour.** Root
  cause: an offline-first violation — the per-tour content/media queries gated on the **in-memory**
  installed-tours store (`enabled: Boolean(tourId && bundleId)`) and `useInstalledTourView` read
  `preferences` from that store, so if the store wasn't populated on a cold offline launch, a tour fully
  present on disk reported as **not installed**. Fix: on-disk bundle is now the source of truth —
  `loadInstalledTour` reads `content.json` + `bundle-meta.json`, the queries gate on `tourId` only, and
  `useInstalledTourView` sources preferences from disk (store as fallback via `resolveTourPreferences`);
  `useInstalledMediaMap` likewise gates on `tourId`. Also hardened `installedToursStore.hydrate()` to
  never silently leave the store empty. Added `content-preferences.test.ts` (Vitest 45→**49**); `tsc` +
  lint clean. On-device offline verification pending.
- **2026-07-11** — **Fixed slow/unreliable footprint loading (needed 3–4 app restarts).** Root cause:
  the live `<Map>` loaded a **remote style URL** (`openfreemap/styles/liberty`); offline/cold-start the
  style-document fetch stalled or failed (`onDidFailLoadingMap`), so the base style never finished
  loading and the footprint GeoJSON overlay (which only attaches after the style loads) never rendered
  until the ambient cache warmed across restarts. Fix ([style.ts](src/lib/map/style.ts),
  [tour-map-view.tsx](src/components/navigation/tour-map-view.tsx), [nav.tsx](src/app/tour/[tourId]/nav.tsx)):
  (1) live map now loads an **inline style object** (`getTourMapStyleObject()`) → no style-document
  network fetch → base style + overlays attach immediately offline; tiles still come from the offline
  pack's `/planet` cache; (2) **glyph/sprite-free fallback style** + **bounded auto-retry** on load
  failure (remount, last attempt = fallback) so a transient failure self-recovers without a restart;
  (3) **pack warm-up effect** on the nav screen builds the tile pack in the background if not ready.
  Added `src/lib/map/style.test.ts` (Vitest 39→**45**); `tsc` + lint clean. On-device Airplane-Mode
  verification still pending.
- **2026-07-11** — **Test suite Phase 1** (both repos). Mobile: extended Vitest from 14→**39 tests**
  (7 files) — Zustand store tests (tour-progress, spot-bookmarks, release-config; storage mocked) and
  navigation edge cases (`navigation-edge.test.ts`). Backend (admin-and-server-aurelia): stood up Vitest
  from **zero → 88 tests** (config, coverage, `vitest-mock-extended` Prisma-mock seam) covering pricing,
  bundle canonical-JSON/signing, prisma-retry, session/OTP hashing, RBAC, error model, slug, and Zod
  schemas. Both `pnpm test` green; both `tsc --noEmit` clean. Component + E2E deferred to a later phase.
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
