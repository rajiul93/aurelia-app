@AGENTS.md

# Aurelia — Project Source of Truth

> Single source of truth for architecture, feature status, known issues, decisions, and history.
> **Read this before starting any task; update it after completing any task.** Treat it as the
> project's persistent memory.

**Status legend:** ✅ Completed · 🚧 In Progress · ⚠️ Known Issue · ⏳ Pending · ❌ Not Started

Last updated: **2026-08-05** (spot detail page stripped of every surface behind text)

---

## 1. Project Architecture

**Mobile app (`aurelia-app`)** — offline-first walking-tour guide.
- **Runtime:** Expo **SDK 57**, React Native 0.86, React 19.2. Requires a **dev build / APK**
  (uses native modules; Expo Go cannot load the offline map). Package: `com.rajiul.aureliaapp`.
- **Routing:** `expo-router` (typed routes). Tour nav screen: [src/app/tour/[tourId]/nav.tsx](src/app/tour/[tourId]/nav.tsx).
- **Maps:** `@maplibre/maplibre-react-native` v11 (`<Map>` + `<GeoJSONSource>`/`<Layer>` API).
- **State/data:** Zustand stores + TanStack Query (`@tanstack/react-query`). Styling: NativeWind.
- **Offline model:** a downloaded tour is installed to disk — `content.json` (tour + route +
  footprint geometry), media as plain files (`media/*` + `media-map.json` v3), and a **MapLibre
  offline tile pack**. Nav data is read from disk, not the network. (Media used to be AES-encrypted;
  removed 2026-08-03 — see §12. The AI knowledge pack is still encrypted.)
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
- ✅ **Stop pin tap → detail, one tap** — tapping a pin routes straight to
  `/tour/{tourId}/spot/{spotId}`. Client-side/offline. (Was pin → `StopCallout` popup → "View
  Details"; the popup was an extra tap for a name the detail page shows anyway, and was removed
  along with `nav.viewDetails` and `StopPin`'s `selected` state.)
  [src/components/navigation/tour-map-view.tsx](src/components/navigation/tour-map-view.tsx)
- ✅ **Refresh button** — remounts the map (rebuilds all layers), invalidates installed-content query,
  restarts nav session, rebuilds the pack if incomplete.
  [src/app/tour/[tourId]/nav.tsx](src/app/tour/[tourId]/nav.tsx)
- ✅ **Live device-heading compass** — N/E/S/W ring + heading needle via `expo-location`
  `watchHeadingAsync` (no new native dep).
  [src/hooks/use-device-heading.ts](src/hooks/use-device-heading.ts),
  [src/components/navigation/compass-overlay.tsx](src/components/navigation/compass-overlay.tsx)
- ✅ **Voice guidance — all TTS, all offline.** Three cues, each de-duped per stop and gated by
  `enableVoiceGuidance` (default **true**): off-route, **approach at 30 m** ("Please proceed to
  {title}", title read from the installed bundle), and arrival at 20 m ("You have arrived…").
  en/es/fr. The approach cue is gated on the nav screen being focused, so a pushed spot detail is
  not narrated from behind the stack.
  ⚠️ The **recorded** approach narration (`useNavigationApproachAudio`) was **deliberately removed** —
  spot audio is now play-on-demand from the spot page only. See §12 (2026-07-20).
  [src/lib/navigation/approach-voice.ts](src/lib/navigation/approach-voice.ts),
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
- ✅ **Cards lock after sign-out.** Signed-out users can still see their downloaded tours on Home
  (offline covers stay on disk) but each card is **Locked** (lock icon) and taps route to Unlock
  (`/explore`). Opening any `/tour/[tourId]/…` deep link hits the tour layout gate with reason
  `signed_out` → `TourAccessLockScreen`. Previously `getTourLockReason` returned `null` when signed
  out (fail-open), so logout did not seal content. Since 2026-08-01 the locked unit is the **tour
  card** rather than per-floor cards (§12) — `unlocked` is `!isTourLocked(tourId)`, so an expired
  grant locks the card too, not just a missing one.
  [src/hooks/use-entitlement-status.ts](src/hooks/use-entitlement-status.ts),
  [src/components/tours/tour-card.tsx](src/components/tours/tour-card.tsx),
  [src/components/tours/floor-card.tsx](src/components/tours/floor-card.tsx)

---

## 3. In Progress (🚧)

- None active.

---

## 4. Known Issues (⚠️)

- ⚠️ **A real `EXPO_PUBLIC_MOBILE_API_KEY` secret is committed to git, on `main`, pushed to origin.**
  Commit `52a5f06` (2026-07-20) uncommented `.env`'s placeholder and filled in the live key
  (`qRhmYQkIwInfwe1GMjOYe-FNshn5lqm8gPzbGBY63o0`) — `.env` has been tracked since the repo's first
  commit (`.gitignore` only excludes `.env*.local`, not `.env` itself), so this value is now in
  history on the remote. The same commit also added a stray `.env.bak-1784545804` (an accidental
  local backup file, holding the *old* placeholder-only `.env`) that has no reason to be tracked.
  **Action needed, not yet done:** rotate `MOBILE_API_KEY` on the server (admin `.env` / Vercel env
  var) and in this repo's `.env`, then `git rm --cached .env.bak-1784545804` and decide whether to
  keep `.env` tracked at all going forward (if it must stay for onboarding, at minimum stop
  committing real secrets into it — use `.env.local`, which *is* gitignored). Not fixed here since
  rotating a shared secret and rewriting how config is distributed are both actions the user should
  confirm.
  ⚠️ Same commit **did** improve the *code-side* handling: see §12 (2026-07-20, API-key hardening).
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
- ⚠️ **`Intl` timezone support is not guaranteed on Hermes.** Host availability and the time-of-day
  background are read on the venue's clock via `Intl.DateTimeFormat({ timeZone })`. Hermes does not
  guarantee this across builds, so [lib/host/availability.ts](src/lib/host/availability.ts) probes it
  once (`supportsTimezoneFormatting`) and, when missing, falls back to the **server's** `isAvailableNow`
  — deliberately *not* to the device clock, which is the bug being fixed. **Verify on-device**: if
  chips or backgrounds look wrong, check that probe first.
- ✅ **venueTimezone is live** — migration applied to production; `release-config` now carries the
  field. `DEFAULT_REMOTE_CONFIG.venueTimezone` ("Europe/Rome") only stands in pre-first-sync.
- ⏳ **The host feature is not localized** — `HostCard`/`HostStatusChip`/the not-active modal are
  hardcoded English while the rest of the app uses `useStrings`. Pre-existing.
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
- ✅ **`hasActivePlan` predicate** (2026-07-15).
- ✅ **Floor picker lives inside the tour** (2026-08-01, §12) — Home selects a *tour*; floors are
  chosen on `/tour/[tourId]` after download. The catalog's `floors[]` is now read only for a card's
  "{n} floors · {n} stops" line, no longer rendered as per-floor teasers.
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
- **App content is disk-first; background *bytes* are left to expo-image** — the offline background was
  blank not for lack of image data but because the **JSON holding the URLs** was memory-only, so a cold
  offline start didn't know what to ask for. expo-image already disk-caches by default
  (`cachePolicy: 'disk'`), so persisting `aurelia/app-content.json` fixes it and a hand-rolled
  file cache would only duplicate what expo-image does. `Image.prefetch` warms the slots instead:
  current slot awaited, the other two fire-and-forget.
  ~~⚠️ Trade-off: the OS may evict expo-image's cache under storage pressure.~~ **Covered** by the
  bundled fallback below — an evicted cache now costs a crossfade, not a blank screen. A durable
  document-dir cache is therefore no longer worth building. [lib/app-content/](src/lib/app-content/),
  [store/app-content-store.ts](src/store/app-content-store.ts)
- **The first frame is a bundled asset, not a remote one** — the background URL *lives in* the
  app-content payload, so on a fresh install there is nothing to render until the first fetch lands.
  `assets/images/backpu-time.png` ships in the binary and is both the `source` when no URL is known
  and the `placeholder` under a remote photo that is still decoding, so no path renders an empty
  background. It is deliberately **light**, unlike the dark CMS photos: anything styling foreground
  text must keep keying off the remote URL (`heroOnDark`), never off "a background exists", and the
  dark scrims in `PageBackground` stay gated on `uri` for the same reason.
  [lib/app-content/fallback-background.ts](src/lib/app-content/fallback-background.ts),
  [components/page-background.tsx](src/components/page-background.tsx)
- **The cold-start image warm belongs in `useAppBootstrap`, not in a hook** — `AppProviders` (and with
  it react-query, `AppBackground`, and `useBackgroundPrefetch`) only mounts *after* the bootstrap
  reports ready, so anything that hook warmed arrived after the splash had already revealed the
  screen — it could never help the frame it was written for. The bootstrap now does the first pass.
  The bundled asset is **awaited** (local only — the splash never waits on the network, by decision);
  `prefetchBackgrounds` is fire-and-forget. `useBackgroundPrefetch` stays for *later* changes (new CMS
  payload, a venueTimezone that only arrives with the first config sync).
  [hooks/use-app-bootstrap.ts](src/hooks/use-app-bootstrap.ts)
- **Wall-clock reads use the *venue's* zone, never the device's** — a visitor carries the zone they
  flew in with, so device-local time would show a Rome host as closed at noon and hand a lunchtime
  visitor the night background. Both `isHostAvailableNow` and `getCurrentTimeOfDay` take
  `remote.venueTimezone`. This mirrors the server rule; see the backend CLAUDE.md §8.
- **Host availability is derived on device, not polled** — `useHosts` used `refetchInterval: 30_000`
  purely to refresh a server-computed `isAvailableNow`. The inputs (hours, zone) change rarely; only
  *now* moves. `useHostAvailability` ticks locally each minute instead: no requests, works offline,
  and the chip stays live between fetches. The server field remains as the Hermes fallback.
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
- ✅ Unit tests **198/198 pass** (`pnpm test`, Vitest, aurelia-app) across 26 files.
  Newest: `src/lib/bundle/knowledge-search.test.ts` (word boundaries incl. the "us"/"museum" and
  singular↔plural guards, small-talk detection, multi-document replies, sentence-boundary trim) —
  the chat ranker had no tests at all before 2026-08-05.
  Also: `src/lib/host/availability.test.ts` (venue-clock window + server fallback),
  `src/lib/app-content/resolve-asset.test.ts` (slot fallbacks + de-dup), and
  `src/store/app-content-store.test.ts` (hydrate / disk-first persist, storage mocked).
  Plus `src/lib/entitlements/access.test.ts`, `src/lib/bundle/expiry.test.ts`,
  `src/store/entitlements-store.test.ts`, zustand store tests, navigation edge cases,
  **map style** (`src/lib/map/style.test.ts`), and **content preferences**
  (`src/lib/bundle/content-preferences.test.ts`). Backend also has a Vitest suite (**183 tests**) —
  see its CLAUDE.md §10.
- ✅ Lint — **0 errors**, 31 warnings. (Was 8 errors: 5 × `set-state-in-effect`, 2 × `refs-during-render`.
  These are React Compiler correctness rules and were fixed by restructuring, not suppressing — see §12.)
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
| Stop pin tap → detail | ✅ | One tap → `/tour/{tourId}/spot/{spotId}` (callout popup removed) |
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
- **Thresholds:** approach **30 m**, arrival 20 m, dwell 30 m/10 s, off-route 10 m —
  `DEFAULT_NAVIGATION_THRESHOLDS` in [src/lib/navigation/types.ts](src/lib/navigation/types.ts).
- ⚠️ **Invariant: `approachRadiusM` > `arrivalRadiusM`.** Both are measured against the same *next
  incomplete* spot, and crossing the arrival radius completes that spot — which advances the next
  one. So an approach radius **inside** the arrival radius describes a window that never opens: the
  approach cue is silently never spoken. Tightening arrival instead is not the answer either — real
  outdoor GPS error in Rome is 10–20 m, so a ~6 m arrival would often never fire and tour progress
  would stall. Guarded by a test in
  [navigation.test.ts](src/lib/navigation/navigation.test.ts).
- **GPS watch:** `Accuracy.Balanced`, `timeInterval: 1_000`, **`distanceInterval: 0`**. The distance
  gate must stay 0 — at 5 m a user standing still (exactly what someone who just opened the map from
  a spot page is doing) received no callbacks at all and no marker ever appeared. Same value in
  [useHostVisitorLocation.ts](src/hooks/useHostVisitorLocation.ts).
- **Start order:** permission → `startSession` → **bootstrap fired without `await`** →
  `watchPositionAsync`. The bootstrap must not block the subscription; it is only there to fill the
  gap before the first watch fix, and `ingestBootstrapFix` drops it once any fix has landed.
- **`Location.Accuracy` is named by power draw, not by speed** — and the names mislead:
  `Lowest` 3 km · **`Low` 1 km** · **`Balanced` 100 m** · `High` 10 m. `Balanced` already avoids a
  GPS lock, so it is the tier that works indoors; there is nothing below it worth reaching for.
  Anything coarser than `maxAccuracyM` (65 m) fails `isFixAccuracyAcceptable` and renders unsnapped,
  so a "cheaper" accuracy buys a marker in the wrong place. Both the watch and the bootstrap
  fallback stay on `Balanced` (dropping the bootstrap to `Low` was tried and reverted, §12).

---

## 11. Assumptions & Limitations

- Tour authoring (Admin) must provide **accurate coordinates and route edges**; the client cannot
  correct bad source geometry.
- The Android **emulator cannot validate** the magnetometer compass or real GPS movement.
- Tour authoring (Admin) must supply an accurate **venue timezone** in remote config; host hours and
  the time-of-day background are meaningless without it, and the app cannot infer it.

---

## 12. Changelog

- **2026-08-05** — **Spot detail page has no surface behind text any more — it sits bare on the photo
  background.** The venue's CMS background is a **black** photo and `AppBackground` renders it with
  `noOverlay` (no scrim at all, §6), but the spot detail screen still painted its own translucent
  panels — so every text block read as a grey box floating over the image. The admin asked for the
  text itself on the photo, fully bare: no fill *and* no outline, blocks separated by spacing only.
  - **Removed fills**: transcript + FAQ + both error `GlassCard`s, the "Stop 3 of 12" pill, the
    footer bar (`rgba(12,10,9,0.72)`), the complete-button's gold active pill, the media tab strip,
    the FAQ item cards (`rgba(255,255,255,0.08)`), and the video player's card — the last being the
    only **fully opaque** panel on the page.
  - ⚠️ **`GlassCard` itself was NOT touched.** ~12 other screens (settings panels, account,
    subscribe, faq, find-host, host card, why-buy) depend on its frosted look. The four call sites on
    this screen became plain `<View>`s instead; the import is gone. Note this also drops GlassCard's
    `padding: Spacing.four` — intended, the text now aligns to the screen's own horizontal padding.
  - ⚠️ **Removing a fill exposed a latent light-theme bug, and fixing it was mandatory, not
    cosmetic.** The media tab strip's idle label used `theme.text` and its icon `theme.textSecondary`
    — `#1a1208` / `#6B5E52` in the light palette, i.e. **near-black on a black photo**. They were only
    ever legible because the strip had a fill. Same for the video caption's `themeColor="textSecondary"`.
    All three now branch on `onDark` to white-alpha. Theme is **admin-controlled** at runtime
    ([use-color-scheme.ts](src/hooks/use-color-scheme.ts)), so light mode is genuinely reachable —
    this would not have been caught by testing the dark default.
  - **Three surfaces were deliberately kept**, each because removing it destroys information rather
    than decoration: the **selected** media tab's gold fill (the only selection indicator), the
    progress-bar track `rgba(255,255,255,0.1)` (the scrubber rail — without it audio progress is
    invisible), and the gold gradients on Next/Done + the play button (their label/icon is `#1a1208`,
    unreadable without the fill). The map button keeps only its **gold hairline**: it is an icon-only
    tap target that stops reading as a button with neither fill nor outline.
  - **The skeleton had to change too.** [spot-detail-skeleton.tsx](src/components/tours/spot-detail-skeleton.tsx)
    drew `rgba(28,25,23,0.42)` panels and a `rgba(0,0,0,0.35)` footer; left alone, those panels would
    **visibly vanish** the moment content resolved — reintroducing exactly the layout-jump class of
    bug the skeleton exists to prevent (see the 2026-08-03 entry). Fills removed; the shimmer `bone`
    stays, since that translucent white *is* the placeholder.
  - `FaqAccordion` and `SpotVideoPlayer` changes are confined to their `onDark` branch —
    [faq.tsx](src/app/faq.tsx) renders the accordion **without** `onDark` and is unaffected.
    `SpotVideoPlayer` gained an `onDark` prop, forwarded by the gallery (its only consumer).
  - `tsc --noEmit` clean, lint **0 errors** (29 pre-existing warnings, none in changed files),
    **198 tests** green — no test asserts on these styles.
  - ⏳ **Not device-verified.** Acceptance: open a stop's detail page and confirm the black photo
    shows through behind transcript, FAQ, stop label, footer and video caption; check the
    **unselected** VIDEO/IMAGES tab label is still readable now the strip has no fill; then flip
    `appTheme` to **light** and repeat — that is where the near-black text would show up.

- **2026-08-05** — **Typing "hi" answered with a random passage about the tour.** Five defects in the
  retrieval/formatting layer, found by tracing that one report. Deliberately scoped to
  [knowledge-search.ts](src/lib/bundle/knowledge-search.ts) + its two callers — no model download, no
  native rebuild, no bundle-format change, so every user benefits immediately (contrast the on-device
  Gemma path, which needs ~806 MB and a 6 GB RAM floor that excludes iPhone 13/SE and most budget
  Android — see §11).
  - ⚠️ **Root cause: the ranker matched substrings, not words.** `scoreDocument` used
    `body.includes(term)`, so `"hi"` matched **t·hi·s / ·hi·story / arc·hi·tecture** — i.e. every
    heritage document scored > 0, and an arbitrary one won. Worse for this app specifically:
    **`"us"` matched "m·us·eum"**. Replaced with a boundary-anchored `RegExp` per term, built once
    per query and reused across every document and field (compiling per term × document × field
    would cost more than the `includes` it replaces).
  - ⚠️ **A bare `\b` would have been a regression, not a fix** — "temple" would stop matching
    "temples". The matcher tolerates a singular/plural pair explicitly. Guarded by a test that
    **fails** if you swap in naive `\b` (verified by doing exactly that).
  - **The token floor stays `> 1`, not `> 2`.** Raising it would have killed "hi"/"us" cheaply but
    silently dropped **AD**/**BC**, which are real terms for "when" questions. Word boundaries fix
    the noise without that cost.
  - **`detectSmallTalk` returns before any search** for bare greetings/thanks in en/es/fr, gated on
    ≤3 tokens so *"thanks, when was it built?"* still searches. This also fixes a second-order bug:
    a greeting had `hasSources: false`, which is the signal that **enqueues an unanswered question** —
    so the admin's knowledge-gap triage list would have filled with "hi"/"hello"/"thanks".
  - **`formatKnowledgeReply` read `documents[0]` only**, discarding the other two the ranker had
    already found — a fact split across a spot description and its FAQ could never be combined. Now
    collects across the top 3, de-duplicated (the same sentence often appears in both).
  - **`trimReply` cut at an exact character count**, so replies ended mid-word with "…". Now trims
    back to the last complete sentence; budget 320 → **480** since up to 3 documents contribute.
  - ⚠️ **`answerNameQuestion` returned a hardcoded English `` `It is called ${title}.` ``** — es/fr
    users got an English sentence. This is the *third* time this file has leaked English (see the
    2026-08-03 entry). Fixed structurally rather than by threading `t()` into a pure module:
    `AssistantAnswer` gained **`kind: "answer" | "greeting" | "none"`** and **`subject`**, so the
    libs return *intent* and `floating-chat` renders the localized string. Pure modules stay pure and
    testable; there is no longer a place for a literal to hide.
  - **New `subject` frame fixes a real comprehension problem**, not just tone: a sentence lifted out
    of a body loses its antecedent (*"It was rebuilt in the 3rd century."* — what was?). Rendered as
    `assistant.answerWithSubject` = `"{title} — {body}"`, deliberately keeping the title **outside**
    the sentence: es/fr need article/gender agreement (*el* Coliseo vs *la* Basílica), so a mid-sentence
    slot would produce broken grammar. New keys `assistant.greetingReply` / `assistant.nameReply` /
    `assistant.answerWithSubject` in all three locales — and since `remoteStrings` overrides
    `strings.ts`, the admin can retune this wording from `/app-content` with no app release.
  - `generate.ts` (the LLM path) retrieves through the unchanged `retrievePassages` signature, so it
    keeps working and inherits the better ranking.
  - **New [knowledge-search.test.ts](src/lib/bundle/knowledge-search.test.ts)** — this module had
    **no tests at all** despite being what every chat answer runs through. 164 → **198 tests**;
    `tsc` clean, lint 0 errors (29 pre-existing warnings, none in changed files).
  - ⏳ **Not device-verified.** Acceptance: type `hi`/`hola`/`merci` → localized greeting, no tour
    content; switch to Spanish and repeat; ask a real question → answer ends on a full sentence; and
    confirm the admin's unanswered-questions list receives **nothing** for the greetings.

- **2026-08-04** — **Questions the assistant can't answer are now queued and synced to the admin, so a
  content gap is a knowledge-base candidate instead of a dead end.** Companion to the admin repo's
  same-day entry (read that one first for the *why* — it traces "replies don't feel human" to the
  generative Gemma 3 1B path being fully built but switched off in production config, and separates
  that from this: capturing the "I don't know" moments themselves).
  - **New** [lib/unanswered-questions/](src/lib/unanswered-questions/) — `queue.ts` +
    `storage.ts` (+ `types.ts`). Mirrors [lib/tour-reminder/storage.ts](src/lib/tour-reminder/storage.ts)'s
    pattern exactly: a JSON snapshot file under `expo-file-system`'s `Paths.document/aurelia/`, not
    AsyncStorage or a zustand-persisted store (this app doesn't use either). Reason for a file at all
    rather than an in-memory fire-and-forget: visitors are routinely offline **inside the venue**,
    which is precisely when the assistant is asked things it can't answer — losing those would defeat
    the point of collecting them.
  - **Trigger point is `floating-chat.tsx`'s `retrievalAnswer`**, specifically
    `answerQuestion(...).hasSources === false`. This one signal covers both the direct
    keyword-fallback path and the "generation ran and then failed mid-stream" path, because
    `generateAnswer` (in `knowledge/generate.ts`) never even starts unless `retrievePassages` already
    found at least one passage — so by the time `retrievalAnswer` runs with nothing, the corpus
    genuinely had nothing, in either path. Deliberately **not** pattern-matching the model's own
    generated refusal text ("I do not have that information…") — that phrase gets reworded by the LLM
    across English/Spanish/French output, and matching against it would be fragile in exactly the
    cases that matter.
  - **`enqueueUnansweredQuestion`** persists to disk first, then makes one best-effort send attempt
    (most visitors have *some* connectivity most of the time, so this usually clears immediately).
    **`flushUnansweredQuestionQueue`** retries the rest — batches of 20 (the server's per-request cap)
    — on every `AppState` "active" transition and once at cold start, stopping at the first failed
    batch and leaving everything from there queued for next time. No `NetInfo` dependency was added:
    this app has none anywhere already, and `use-release-config-sync.ts` solves the identical
    "retry when connectivity might be back" problem the same way (foreground-triggered, not a true
    reachability listener) — followed that precedent instead of introducing a new native module.
    Queue capped at 200 items, oldest evicted first, so a visitor offline for days can't grow the
    file without bound.
  - **Mounted as `UnansweredQuestionsSyncListener`** in
    [providers/app-providers.tsx](src/providers/app-providers.tsx), alongside
    `ReleaseConfigSyncListener` — same "listener component that owns one `useEffect`, mounted once at
    the provider root" shape every other background-sync concern in this app already uses.
  - Server side (new table, dedup-by-repeat-count, admin triage viewer) is entirely in
    `admin-and-server-aurelia`'s CLAUDE.md — nothing here needed a schema change.
  - `pnpm typecheck`/`expo lint` clean (0 new errors; pre-existing warning count unchanged); **184
    tests** still green — no new tests were added for the queue module itself (file-system + network
    side effects, not pure logic; this app's existing test suite is scoped to pure logic and stores,
    per §8).

- **2026-08-03** — **Live API 404 fixed: `.env` base URL had lost its `/app` segment.**
  `EXPO_PUBLIC_API_BASE_URL` was `https://colosseum.dreamtourism.it/api/v1`, but every service path is
  base-relative (`/catalog/tours`, `/tours/{id}/download`, `/release-config`) — so every call resolved
  to `/api/v1/<path>`, the **admin** API surface, where none of those routes exist. Restored to
  `…/api/v1/app`, which is what [.env.example](.env.example) and the `hosts.service.ts:7` comment both
  already specify. **`EXPO_PUBLIC_*` is inlined at bundle time**, so this needs `pnpm start --clear`
  in dev and a fresh EAS build for any installed binary — the old URL is baked into it.
  - The same session uncovered a **server-side outage behind it**: every `/api/v1/app/*` endpoint was
    500ing because the admin repo had deployed the on-device-LLM config columns without applying their
    migration (`getConfig()` runs on every mobile request). Fixed in the admin repo; see its CLAUDE.md.
  - ⚠️ **`EXPO_PUBLIC_COLOSSEUM_TOUR_ID` is stale** — it holds `cmr6g15i4…` while the live published
    tour is `cmsalq4l5…`. It is read only by [constants/tours.ts](src/constants/tours.ts) and used only
    for `subscribe.tsx`'s Stripe `tourIds`, so tour loading is unaffected, but **checkout would
    reference a tour that does not exist**. Update it before self-service purchase is exercised.
  - ⚠️ **No remote config is reaching the app** — the server's `AppReleaseConfig.publishStatus` is not
    `PUBLISHED`, so `/release-config` 404s and `use-release-config-sync.ts` falls back to the cached
    config by design. Theme, maintenance mode, reminder cadence and the LLM config all stay at their
    cached/default values until an admin publishes it on the dashboard's `/app-content`.

- **2026-08-03** — **On-device Gemma 3 1B writes the assistant's answers (Phase 2).** The assistant
  was retrieval-only — substring scoring that quoted one or two sentences verbatim. It now runs a
  real RAG loop on-device: the existing ranker retrieves, Gemma 3 1B writes the reply. Planned as
  "Phase 2" back in `cached-stargazing-minsky.md`; `assistant.ts`'s own comment named the model.
  - **Runtime: `llama.rn` 0.12.8**, not `react-native-executorch`. It has an Expo config plugin, it
    supports Gemma 3 GGUF *today* (ExecuTorch's site still says Gemma "soon"), and its
    `completion(params, callback)` streams tokens off a background thread. Added to `app.json`
    plugins — ⚠️ **needs `expo prebuild` + a dev-client rebuild on both platforms.** (The IDE flags
    it as an invalid config plugin; so is the pre-existing `@maplibre/maplibre-react-native`, and
    `npx expo config --type prebuild` resolves both cleanly. It is the IDE's parser, not the plugin.)
  - **New `src/lib/llm/`** — `device-capability.ts` (6 GB total-RAM floor, memoized; simulators are
    flagged because they report the host Mac's RAM), `model-manager.ts` (resumable
    `File.createDownloadTask`, free-space check with a 300 MB margin, then **size + native `File.md5`**
    verification), `llama-runtime.ts` (one context held open across questions, released on
    `AppState` "background" only, `clearCache()` before each answer), `prompt.ts` (the grounding
    contract + 700-char passage trimming).
  - **`answerQuestion` was NOT replaced.** The original plan said the model would swap in behind it
    without touching callers; streaming makes that impossible, so instead `retrievePassages` was
    extracted from it and a separate async `generate.ts` was added. The sync retrieval path — the
    fallback — is byte-for-byte the behaviour that shipped before, and its tests still pass unchanged.
  - **Top-3 passages now reach the model**, where `formatKnowledgeReply` only ever used
    `documents[0]`. Facts spread across two entries can finally be combined.
  - **Fallback chain, every link silent** (flag off → device under 6 GB → native runtime missing →
    no model on disk → **nothing retrieved** → context failed → generation failed/empty). All seven
    are covered by `generate.test.ts`; the no-passages guard was **mutation-tested** — removing it
    fails that one test and passes the other seven.
  - ⚠️ **The no-passages guard is the hallucination guard.** With nothing retrieved a 1B model
    invents an answer, and on a paid heritage tour a confidently wrong date is worse than "I don't
    know". It sits *before* the context load, so the model is not even started.
  - **UI**: `chat-store` gained `startAssistantMessage`/`appendToAssistantMessage`/
    `finishAssistantMessage` so tokens grow the last bubble; `floating-chat`'s `handleSend` is async
    with a **stop button** (a 1B model takes seconds — closing the sheet was the only escape
    otherwise) and stops generation on unmount. Stopping keeps the partial text; *failing* replaces
    it with the retrieval answer.
  - **Model is opt-in**, downloaded from a new Settings panel — never bundled, never automatic. It is
    ~0.5 GB and the typical user is standing at the venue on mobile data.
  - ⚠️ **Known, accepted risks** (§4/§11): this runs alongside GPS, MapLibre and TTS, so heat,
    battery and RAM are all real concerns; a mid-range phone will take seconds per answer where
    retrieval was instant. Target floor is **6 GB RAM**; below that the assistant is unchanged.
    Remote `enableOnDeviceLlm` is the kill switch — it needs no app release.
  - ⏳ **Nothing here is device-verified.** Static checks only: `tsc --noEmit` clean, lint 0 errors
    (29 pre-existing warnings, unchanged), **164 → 184 tests**. Token/sec, thermals, memory under a
    live nav session, and the whole download path still need a real phone after the rebuild.

- **2026-08-03** — **Offline base map switched from dark stone to a light day palette.** Colour-only
  change, confined to [style.ts](src/lib/map/style.ts): `background` `#1c1917`→`#f5f3f0`, `water`
  `#0f172a`→`#a8c8e8`, `roads-minor` `#44403c`→`#e8e4df`, `roads-major` `#57534e`→`#ffffff`,
  `landuse-park` `#292524`→`#dfe9d8`, `buildings` `#292524`→`#e3ded7`. The same three values were
  applied to `getFallbackMapStyleObject()` so a style-load retry does not flash the map back to dark.
  Layer ids, filters, source-layers, widths and opacities are untouched.
  - **The offline packs did not need re-downloading.** `TOUR_MAP_STYLE_URL` (liberty) is used *only*
    by `OfflineManager.createPack` ([offline-pack.ts](src/lib/map/offline-pack.ts)), and vector tiles
    cache geometry, not colour — the palette lives entirely in the inline style object the live map
    renders with. Already-installed tours keep working offline unchanged.
  - Overlay chrome (`rgba(28, 25, 23, 0.82)` chips + white text in nav.tsx) deliberately left dark —
    a dark translucent chip reads well over a light map.
  - ⚠️ **Three overlay colours are now low-contrast against the light background** and were left as-is
    because this change was scoped to the base style: the user dot's `#ffffff` stroke
    (`tour-map-view.tsx:363`), the walk-trail step stroke `rgba(255, 243, 199, 0.9)` (`:290`), and the
    completed-route line `rgba(225, 165, 102, 0.35)` (`:303`). Fix these if they look washed out on
    device. `style.test.ts` asserts no colours, so all 164 tests stayed green; lint clean.

- **2026-08-03** — **Home → tour → floor stopped shaking on Android.** Reported as the page shaking
  and hanging, every time. It was four separate bugs firing together — **three of them regressions
  from earlier the same day.**
  - **The chat head jumped exactly 62px.** [floating-chat.tsx](src/components/chat/floating-chat.tsx)
    computed `bottom` from `segments[0] === "(tabs)"`, so leaving the tab group changed an
    **unanimated** layout prop the instant the router updated — mid-transition. `bottom` is now
    pinned to the off-tab value and the tab-bar delta is an animated `lift` shared value folded into
    the transform. The drag range moves with it, so `translateY` is **clamped on read** in the
    animated style and on pick-up in `onStart` — never written back, because reanimated's lint rule
    forbids mutating a shared value that an effect or hook dep also owns (this is what the
    `eslint-disable` on the gesture memo is about).
  - **The chat corpus was O(N²) at startup.** `loadInstalledTourSearchDocuments`
    ([load.ts](src/lib/bundle/load.ts)) called `findTourContentByScanning` **first**, which
    `JSON.parse`s *every* installed tour's `content.json` hunting for a match — once per tour, so N
    tours cost N² full parses on the JS thread, fired as the splash lifted. Now tries the canonical
    directory first (matching what `loadTourContentFromDisk` always did) and the query is
    `enabled`-gated on the chat being **open** — the corpus is not needed until someone asks.
  - **FloatingChat re-rendered everything on every navigation** (`usePathname`/`useSegments`). The
    gesture is memoized and the panel subtree only mounts while open, instead of being permanently
    built and translated offscreen.
  - **The floor-card bounce never stopped.** Added earlier that day, it ran an uncancelled infinite
    loop per card — including through the push, on an `elevation: 6` `overflow: hidden` container.
    Now gated on `useIsFocused()` (from **expo-router**, which re-exports it; `@react-navigation/native`
    is not a direct dependency here).
  - **Android transition.** Both stacks used `simple_push` with `contentStyle: transparent` over one
    shared photo background, so *both* screens' content slid visibly across it. Switched Android to
    `fade`/200ms; iOS keeps its native push. The transparent-over-one-photo design is deliberate, so
    the transition was changed to suit it rather than making screens opaque.
  - **Loading no longer changes the layout.** `FloorCardSkeleton` hard-coded a 170px `FloorCard`
    height but Home renders `TourCard` at **250px** — a 240px jump across three cards the moment the
    catalog landed. It now takes `cardHeight`/`radius`. The tour and floor screens rendered a
    centered spinner and then swapped in a whole ScrollView; both now render the same shell with
    placeholders. `TourCard` also prefetches the tour content on press, so the placeholder usually
    never shows (the disk read has a deliberate 0/100/300/600/1200ms retry ladder).
  - **Per-render work.** `fallbackTourPreferences` returns a fresh object literal, so
    `use-installed-tour-view`'s `preferences` changed identity every render and its `viewContent`
    memo never hit — the whole content graph was re-filtered each time. `preferences` is memoized,
    and the floor/spot math on both screens is hoisted above the early returns (hooks can't run
    after them), including a `stopCountByFloor` map that replaces an O(floors × spots) filter that
    ran **inside** the render map.
  - **Investigated and deliberately not changed**: the `tour/[tourId]/_layout.tsx` Slot ↔ lock-screen
    flip was a suspected remount, but the auth store hydrates in `use-app-bootstrap` before any
    screen renders, so `isSignedIn` cannot flicker — the existing code is correct.
  - **Follow-up, same day — the in-tour transitions had no animation at all.** Home → tour improved,
    but floor → stop list and stop → detail still jumped. Cause:
    [tour/[tourId]/_layout.tsx](src/app/tour/[tourId]/_layout.tsx) rendered **`<Slot />`**, so every
    route under a tour (index, floor, spot, nav, prepare) was a single screen to the outer stack and
    swapped in one frame with **no transition**. Converted to a `<Stack>` with the same
    transparent/fade options; the lock-screen branch is unchanged. Also memoized the spot-detail
    screen's derived data (`orderSpotsAcrossFloors`, translation, FAQ mapping — all re-running per
    render) and added [stop-list-skeleton.tsx](src/components/tours/stop-list-skeleton.tsx), because
    the floor screen's placeholder was 4 floor cards while its real layout is one card plus stop
    rows — a mismatch that reintroduced the very jump it was meant to prevent.
  - **Second follow-up — the spot detail screen grew after mount.** Two components gated their whole
    layout on an **async** `useInstalledMediaUri` result, so they occupied **zero height** on first
    render and then pushed the page down a moment later:
    [spot-visual-media-gallery.tsx](src/components/tours/spot-visual-media-gallery.tsx) rendered its
    panel only once `playbackUrl` existed (the panel has no height of its own, so 0 → a full 4:3 or
    16:9 box), and [spot-audio-section.tsx](src/components/tours/spot-audio-section.tsx) returned
    `null` outright. Both now reserve the space with a correctly-sized placeholder — the gallery's
    ratio follows the active tab, since video is 16:9 and images are 4:3.
    ⚠️ **This is the pattern to watch for on any new screen**: a component whose *presence* depends
    on an async media uri will always shift the layout. Reserve the box, don't gate the render.
  - `tsc` clean, `pnpm lint` 0 errors, **164 tests**. ⏳ **Unverified on device** — and worth
    measuring in a **release** build, since dev-mode Metro exaggerates all of this.

- **2026-08-03** — **Theme is admin-controlled and cached; the Settings switcher is gone.**
  Appearance is a venue-wide branding decision, not a per-user preference, so it now comes from
  remote config set at the admin's `/app-content` page.
  - **Why remote config and not app-content**: both persist to `Paths.document/aurelia/`, but
    release-config also has a **compiled-in default** (`DEFAULT_REMOTE_CONFIG`), so a first-ever
    launch with no network still has a theme — `app-content-store` leaves `content` null until disk
    or fetch. Release-config is also language-independent, while app-content is keyed per-language
    and only re-seeds when `snapshot.language === language`.
  - **Offline behaviour is what was asked for**: [use-color-scheme.ts](src/hooks/use-color-scheme.ts)
    reads `useRemoteConfig().appTheme`; the store hydrates from
    `aurelia/release-config.json` at bootstrap, and `use-release-config-sync` silently keeps the
    cached value when a fetch fails. After the first sync the API is no longer needed.
  - **Deleted**: `theme-settings-panel.tsx`, `store/theme-store.ts`, `lib/theme-storage.ts` (a
    SecureStore key `aurelia.theme`), the panel's mount in `settings.tsx`, the bootstrap hydrate in
    `use-app-bootstrap.ts`, and 5 i18n keys × 3 languages (`settings.theme*`).
  - ⚠️ Requires backend migration `20260803120000_add_app_theme` — **applied**, see the server's
    CLAUDE.md for the migration-history baselining that had to happen first.

- **2026-08-03** — **One global floating chat head replaces both chat surfaces.** Same day as the
  entry below, which merged the two corpora — this removes the two *screens*. The admin wanted chat
  reachable everywhere, Facebook-chat-head style, not a tab you navigate to and not a button buried
  inside a tour.
  - **Mounted once at the root** — [_layout.tsx](src/app/_layout.tsx), immediately after
    `<TourReminderGate />` inside `<AppBackground>`, the single node above every route (tabs, tour,
    download, subscribe, faq, pages). `TourReminderGate` was the precedent for a root-mounted,
    store-driven global overlay.
  - ⚠️ **`GestureHandlerRootView` had to be added** — `react-native-gesture-handler` was a direct
    dependency but appeared **nowhere in `src/`** (only pulled in transitively by react-navigation),
    and this codebase had **no drag interaction at all** before now. Without that root the pan
    gesture silently does nothing on Android. It now wraps the whole tree.
  - **No RN `<Modal>` for the panel** — Modal creates a separate native view hierarchy that
    gesture-handler does not reach without its own nested root. Follows
    [app-drawer.tsx](src/components/navigation/app-drawer.tsx) instead: `StyleSheet.absoluteFill` +
    `pointerEvents` + reanimated `withTiming`, which keeps head and panel in one tree.
  - **Drag**: `Gesture.Race(pan, tap)` — Race, not Simultaneous, so a drag never also fires as a tap.
    Snaps to the nearer edge with `withSpring`. Position lives in shared values on the root-mounted
    component, so it survives navigation but **deliberately is not persisted to disk** (resetting on
    app restart is expected chat-head behaviour, and a drag shouldn't hit storage every frame).
  - **Tour priority**: `answerQuestion` takes `preferredTourId`, derived from `usePathname()` in
    [current-tour-id.ts](src/lib/chat/current-tour-id.ts). `useLocalSearchParams` is unusable here —
    it returns the params of the screen a component renders *in*, and this renders above all of them;
    `usePathname` is what the maintenance/onboarding gates already use at this level. Asked inside a
    tour, that tour answers first; only if it has nothing does the rest of the corpus run.
  - **Conversation state lives in [chat-store.ts](src/store/chat-store.ts)**, not the component —
    screens under the root remount freely, and a question asked on a floor screen must still be there
    after walking to a spot.
  - **Features carried over from the deleted in-tour screen** (each would have been a regression):
    `remote.enableOfflineChat` gate, `remote.maxChatHistory` truncation, the no-knowledge banner and
    loading spinner, and the welcome text **resolved at render** rather than frozen in a `useState`
    initializer — the old Assistant tab had that bug and stopped re-translating on language change.
  - **Deleted**: `(tabs)/assistant.tsx`, `tour/[tourId]/chat.tsx`, `use-installed-tour-search.ts`
    (singular — its only consumer was the chat screen), `queryKeys.installedTour.search`, the
    "Ask Aurelia" button + its orphaned style, the `assistant` tab registration and its `sparkles`
    icon entry (**tab bar is now three tabs**), the long-dead `filterSearchDocuments`, and 12 i18n
    keys × 3 languages (`chat.*`, `tabs.assistant`, `tour.askAurelia*`, plus the never-read
    `assistant.send`/`chat.send`/`guides.askAurelia`). `formatKnowledgeReply` lost its hardcoded
    English miss string — unreachable now that `answerQuestion` returns early on no match.
  - Head hides on `/welcome` and the full-screen `/tour/[id]/nav` map. Its resting inset keys off
    `useSegments()[0] === "(tabs)"` because [use-tab-bar-height.ts](src/hooks/use-tab-bar-height.ts)
    returns the tab-bar height unconditionally and would otherwise lift it ~70px on tour/download.
  - `tsc --noEmit` clean, `pnpm lint` 0 errors, **164 tests** green. ⏳ **Drag is unverified on a real
    device** — that is the one thing to check first, Android especially.

- **2026-08-03** — **The Assistant tab can finally answer about tours; media encryption removed.**
  Two changes from one session, both prompted by the admin noticing the assistant answered with
  things absent from the tour while knowing nothing the tour actually contained.
  - **Root cause: there are two assistants reading disjoint corpora.** The **Assistant tab**
    ([(tabs)/assistant.tsx](src/app/(tabs)/assistant.tsx)) built its corpus in
    [knowledge/assistant.ts](src/lib/knowledge/assistant.ts) from **only** `pack.faqs` +
    `pack.knowledge` — the global `/api/v1/app/knowledge-pack` response (`Faq` + assistant-flagged
    `KnowledgeArticle`, neither of which has a `tourId` column), hardcoding `tourId: ""` on every
    entry. The in-tour **"Ask Aurelia"** ([tour/[tourId]/chat.tsx](src/app/tour/[tourId]/chat.tsx))
    reads the bundle's `search/documents.json` (spots, spot FAQs, `AiKnowledge`). So tour content was
    invisible to the tab, and the tab's global articles were unrelated to any tour. Compounding it,
    `AiKnowledge` is authored in a **separate admin surface** from spot text with no sync — the
    server never derives assistant knowledge from spot prose.
  - **Fix**: new [use-installed-tours-search-documents.ts](src/hooks/queries/use-installed-tours-search-documents.ts)
    merges every installed tour's search corpus into the tab, narrowed per tour to the **audience it
    was downloaded with** (a bundle carries all 4 audience variants of every spot; without this the
    top-3 ranking could be the same stop four times). `answerQuestion` takes the merged documents and
    returns `sourceTourId`, which the screen renders as `assistant.fromTour` — a tour-specific fact
    must not read as a claim about the whole app.
  - **Language fallback (the reported es/fr dead end)**: `buildDocuments` took
    `faq.question[language]` with no fallback, so an untranslated FAQ left the corpus entirely and
    Spanish/French users got "no answer" for everything. Now falls back to `en`, matching what
    [use-knowledge.ts](src/hooks/use-knowledge.ts) already did for the FAQ/info screens; the search
    retries in `en` too, so an English-only tour stays answerable in any UI language. `answerQuestion`
    now returns an **empty** reply on no match instead of `formatKnowledgeReply`'s hardcoded English
    miss string, so the caller's translated `assistant.noAnswer` is what users actually see.
  - ⚠️ **It is not an LLM.** No OpenAI/Anthropic/on-device model exists in either repo — it is
    substring scoring in [knowledge-search.ts](src/lib/bundle/knowledge-search.ts) (title +12,
    keywords +8, body +3), which takes **only `documents[0]`**, truncates at 320 chars, and drops
    `what/where/when/why/how/who` as stop words. Odd answers are usually this, not missing data.
  - **Media encryption deleted.** AES-256-GCM at rest protected nothing: the R2 bucket is public and
    unsigned (`buildPublicUrl`), and every media url ships in **plaintext** inside `content.json` and
    `media-map.json` — so file access yielded the urls directly, bypassing the cipher entirely. It
    cost two full pure-JS AES passes per file at install plus 2× disk. `encrypted-media.ts` and
    `media-key.ts` are gone; `media-cipher.ts` → **`crypto/cipher.ts`** because the **knowledge pack
    (`knowledge/pack.enc`) still uses it** with its own `aurelia.knowledgeKey` — do not delete it or
    drop `@noble/ciphers`. `media-map.json` is `version: 3` with plain string paths.
  - **Old installs re-download**: new `installFormatVersion` on `InstalledTourMeta` +
    `isInstallFormatStale` ([version-compare.ts](src/lib/bundle/version-compare.ts)) folded into
    `updateAvailable`, so a pre-change install surfaces as "Update offline tour" through the existing
    UI. Both meta readers in `synthesize-meta.ts` default it to `0`. Stale installs still open — media
    just falls back to remote urls.
  - ⏳ **Not fixed, known**: `filterSearchDocuments` ([content-preferences.ts:120](src/lib/bundle/content-preferences.ts#L120))
    is **dead code — never called**, so the in-tour chat answers from spots QUICK mode excluded;
    `searchTourKnowledge` retries without the audience filter, so CHILDREN can get ADULTS text; the
    knowledge-pack endpoint has **no entitlement check** and `Faq` has no publish gate.
  - `tsc --noEmit` clean, `pnpm lint` 0 errors, **164 tests** passing. Not yet verified on device.

- **2026-08-01** — **Home selects a *tour*; the floor picker moved inside the tour.** A deliberate
  product reversal of the 2026-07-15 "Home shows Locked floor cards again (not tour cards)" entry
  below — read both together before changing either. The admin's ask: a visitor should pick **one
  tour**, download it whole, and only then choose a floor. Home was doing the opposite: a 4-floor
  tour rendered 4 separate cards *before* download, all deep-linking to the same
  `/download/[tourId]`, so floor selection happened on a screen where no floor content existed yet.
  - **Nothing under the picker changed.** `/tour/[tourId]/floor/[floorId]` and everything below it
    (map, spots, audio, navigation) is untouched, and the new picker pushes the exact same route the
    old `TourFloorCards` did.
  - **No backend or data change was needed** — the two things that sound like they'd need one
    already worked: `install.ts` has always downloaded the whole tour (every floor) in one bundle,
    and `/me/entitlements` has always returned **every** tour in the grant, so one unlock already
    unlocks all of them. This was purely a UI/navigation rearrangement.
  - **New** [tour-card.tsx](src/components/tours/tour-card.tsx) — one card per tour, **whole card
    tappable** (per the admin's choice) routing by state: locked → `/explore`, installed & current →
    `/tour/[tourId]`, otherwise → `/download/[tourId]`. It nests the unmodified `TourDownloadButton`;
    RN gives the inner Pressable the touch, so "Change options" still works without the outer tap
    firing. New [use-tour-download-state.ts](src/hooks/use-tour-download-state.ts) holds the
    `installed`/`updateAvailable` pair so the outer tap target and the inner button can never
    disagree.
  - **Locked state uses `isTourLocked`, not `entitledVersionsByTourId.has()`.** The old Home used
    the weaker `unlockedTourIds.has()` for catalog teasers and the stronger `isTourLocked` only for
    installed cards. Unifying on the weak one would have shown "Open Offline Tour" on a tour whose
    **grant had expired** — the layout gate would still seal it, so not a hole, but the card would
    lie. `isTourLocked` also covers `access_inactive`, preserving the 2026-07-15 sign-out invariant
    (§2) at tour level.
  - ⚠️ **Caught an offline regression before it shipped.** Building the list from
    `useCatalogTours()` alone means that offline — no network, **and the catalog query is not
    persisted** (plain `useQuery`, no `PersistQueryClientProvider` anywhere) — `tours` is empty, so a
    visitor standing in the venue would have seen an error card and **no way to open the tour they
    already downloaded**. The old code rendered installed floors straight off disk, so it survived
    this. Fixed with [installed-tour-card.tsx](src/components/tours/installed-tour-card.tsx):
    installed tours the catalog didn't return are merged in ahead of the catalog list and read their
    cover/floor count off disk. It is a separate component so only those cards pay for a bundle
    read — a catalog-backed card already has what it needs from the API.
  - `/tour/[tourId]/index.tsx` now branches: `content.floors.length > 0` → floor picker (sorted by
    `floorNo`, `tour.chooseFloor`); a **v1 bundle keeps the flat cross-floor stop list verbatim**.
    That branch, rather than a synthetic default floor, is what avoids the self-loop the old
    `TourFloorCards` had (its no-floors fallback linked to `/tour/[tourId]` — the very screen this
    now lives on). Header, description, progress, `GuidedWalkSection` and the Host/Assistant buttons
    are all tour-wide and stayed put. Safe to drop the picker's own lock check: `_layout.tsx`
    already gates the route with `getTourLockReason`.
  - Deleted `tour-floor-cards.tsx` (Home was its only consumer). `floor-card.tsx` is unchanged and
    still used — by the picker. New keys `tours.yourTours` / `tours.floors` / `tour.chooseFloor` in
    all three locales. `tsc` clean, lint 0 errors (33 pre-existing warnings, none in changed files),
    164 tests pass. ⏳ **Not yet verified on a device** — no simulator run this session.

- **2026-07-21** — **Documentation pass over 2026-07-20's commits; found a live secret in `.env`.**
  No new feature — the user asked for the last day's UI/other work to be checked against this file.
  Every 2026-07-20 commit already carried its own CLAUDE.md update except one piece of `52a5f06`,
  which bundled the documented nav/voice change together with an **undocumented** API-key hardening
  fix in [env.ts](src/lib/env.ts): `env.mobileApiKey` used to fall back to the literal string
  `"your-app-key"` — the same placeholder committed in `.env.example` — so a build where
  `EXPO_PUBLIC_MOBILE_API_KEY` failed to inline would ship a key anyone could read out of the repo,
  and every API call would *look* like it worked while authenticating as that shared placeholder.
  `resolveMobileApiKey()` now falls back to `""` instead (server answers 401, home screen already
  has a "Check API URL and MOBILE_API_KEY" message for that case) and warns once in `__DEV__` if the
  key is missing. Throwing was considered and rejected — `env.ts` resolves at import time, so a throw
  there is a crash on launch, not a friendly error screen.
  - **While checking this, found the fix's own commit had committed a real production secret** (see
    §4) — filed as a known issue rather than rotated, since rotating a shared credential isn't mine
    to do unasked.
  - No code changed in this pass beyond CLAUDE.md itself.

- **2026-07-20** — **One-tap pin → detail, and an approach announcement at 30 m.**
  - **Pin tap goes straight to the stop.** The `StopCallout` popup in between was an extra tap for a
    name the detail page shows anyway. Removed with it: `selectedStopId` state, the callout `Marker`,
    the now-unused `stopTitleById` **prop** on `TourMapView` (nav still computes the map — the
    approach cue speaks from it), `useStrings` in the map view, `StopPin`'s `selected` prop +
    `headSelected` style, `stop-callout.tsx`, and `nav.viewDetails` in all three locales. Each
    deletion was grep-verified as an orphan first.
  - **Approach TTS at 30 m**, not 10 m as first drafted. **10 m could never have fired**: approach and
    arrival are both measured against the same *next incomplete* spot, and crossing arrival (20 m)
    completes that spot, advancing `getNextIncompleteSpot` — so by 10 m the cue is being evaluated
    against the *following* stop. The feature would have shipped silently dead. Tightening arrival to
    ~6 m instead was rejected: outdoor GPS error in Rome is 10–20 m, so stops would often never
    complete and progress would stall. **The invariant `approachRadiusM > arrivalRadiusM` is now
    documented on the constant and asserted by a test** — this is exactly the class of bug that hides.
  - New [approach-voice.ts](src/lib/navigation/approach-voice.ts), a deliberate mirror of
    `arrival-voice.ts` (per-spot de-dupe, `Speech.stop()` then `speak`). `resetApproachVoice()` runs
    in the session cleanup beside `resetArrivalVoice()`. New `nav.approachVoice` string (en/es/fr).
  - **Focus gate uses `useFocusEffect` + a ref, not `useIsFocused()`.** Pushing a spot detail leaves
    nav mounted and the GPS session running, so the cue needs gating — but `enableFreeze(true)` +
    `freezeOnBlur` stop a blurred screen from re-rendering, so a state-based flag is not guaranteed
    to reach the GPS callback. Reading a ref also keeps `onApproachSpot` stable, preserving the
    trimmed tracking-effect deps from the fix earlier today.
  - ⚠️ **`useNavigationApproachAudio` deleted — this is an intentional product removal, not an
    oversight.** Walking up to a stop no longer auto-plays its recorded narration; the audio is now
    play-on-demand from the spot page's `SpotAudioPlayer`. §2 updated to match.
  - `tsc` clean; **162 → 164 tests**; lint at baseline (0 errors, 31 warnings).
  - ⏳ On-device verification pending (emulator cannot test GPS, §11): one tap opens the stop; ~30 m
    out speaks the localized title once with no narration clip, then arrival TTS at 20 m; opening a
    spot detail from the map silences the approach cue.

- **2026-07-20** — **Spot → Map: the user's own position now appears on the first open.** Reported as
  "opening the map from a spot page shows the route but not my location the first time, and it keeps
  reloading". Causes, all in the GPS start path:
  - **The watch had a 5 m distance gate.** `watchPositionAsync` used `distanceInterval: 5`, which on
    Android suppresses callbacks entirely until the user physically moves 5 m — and someone who just
    opened the map is standing still, looking at the phone. Now `0`. The same value was in
    [useHostVisitorLocation.ts](src/hooks/useHostVisitorLocation.ts) (Find Host had the same latent
    bug); fixed together.
  - **The subscription was created *after* an awaited bootstrap.** `resolveBootstrapLocation()` was
    awaited before `watchPositionAsync`, and it can take ~6 s (a live fix behind a timeout). During
    that window no subscription existed, so a fix arriving then had nobody to receive it. The
    bootstrap is now fired without `await`, in parallel.
  - **Racing the watch needed a guard, and the guard mattered more than it looked.**
    `ingestBootstrapFix` applied unconditionally, so a late bootstrap fix could overwrite a newer
    watch fix. Not merely a marker jump: the poor-accuracy branch of `processBootstrapLocation`
    returns `walkTrail: []`, `snappedLocation: null`, `traversedFraction: 0`, so it **erases the
    walk**. The store now drops a bootstrap fix once `hasLocationFix(snapshot)` — a shared predicate
    moved into [process-location-update.ts](src/lib/navigation/process-location-update.ts) so the
    store and the hook cannot disagree. Timestamp comparison was considered and rejected: last-known
    is older by definition and a live fix always beats it, so it would add state for nothing.
  - **Two permission prompts raced.** `TourMapView` called `LocationManager.requestPermissions()`
    while `useNavigationSession` was already requesting; on Android a second request can cancel the
    first. Removed — the map draws the user from `snapshot`, never from MapLibre's native puck.
  - **The tracking effect restarted for unrelated reasons.** Its deps included `t`, `language`,
    `onApproachSpot` and the voice flag; `t` changes whenever the app-content query returns a new
    object. The cleanup calls `reset()`, so each restart **wiped the user's position mid-walk**.
    Those inputs moved into a `handlersRef` (written in an effect, not during render — the React
    Compiler rule from 2026-07-17 holds); deps are now `canNavigate`/`tourId`/`floorId` plus the
    stable zustand actions.
  - ~~Bootstrap's live fallback asks for `Accuracy.Low` instead of `Balanced`.~~ **Reverted the same
    day — the reasoning was wrong.** The claim was that `Low` means wifi/network triangulation and so
    suits indoors; in fact `Balanced` is already that tier, and the enum is named by power draw, not
    speed: `Low` = "accurate to the nearest kilometer", `Balanced` = "to within one hundred meters"
    (expo-location 57 `Location.types.d.ts`). A `Low` fix also exceeds `maxAccuracyM: 65` and takes
    the unsnapped branch, so it would paint the marker up to a kilometre away — worse on a walking
    map than showing nothing. Bootstrap stays on `Balanced`.
  - New [navigation-session-store.test.ts](src/store/navigation-session-store.test.ts) (4 tests,
    **158 → 162**) covering the guard. Verified it *fails* without the guard (2 failures) rather than
    passing for the wrong reason. `tsc` clean; lint at baseline (0 errors, 31 warnings).
  - ⏳ **Not done, deliberately:** the style-retry map remount (`<Map key={styleAttempt}>`) stays. It
    only runs when a style load genuinely fails and was added to fix a real problem (§2, inline
    style); whether it still causes visible reloads must be observed on device after these fixes,
    not assumed.
  - ⏳ On-device verification pending — the emulator cannot test this (no real GPS movement, §11).
    Acceptance: fresh install → spot page → map button → **one** permission prompt and a marker
    within seconds **while standing still**; then 60+ s on the same screen with no session restart.

- **2026-07-20** — **Account → subscribe: snappier nav + readable plan form on the photo bg.** Global
 `AppBackground` unchanged (one photo under every screen). Account tab: lighter `FadeInDown` (no
 spring), prefetch `/subscribe` route + subscription config while the tab is open; plan screen uses
 `fade` stack transition (180 ms). Subscribe: header uses `onDark` when a CMS background URL is
 active; plan/device/pricing live in `GlassCard` with opaque chip surfaces so light-mode text is not
 painted directly on the dark photo.
 [explore.tsx](src/app/(tabs)/explore.tsx), [subscribe.tsx](src/app/subscribe.tsx),
 [screen-header.tsx](src/components/screen-header.tsx), [_layout.tsx](src/app/_layout.tsx).

- **2026-07-20** — **The background is never blank on first paint.** Reported as "the background
  takes a moment to load when the app first opens". Two causes, and the second was the real one:
  - **The warm-up could never have worked.** `useBackgroundPrefetch` lives in
    `ReleaseConfigSyncListener`, inside `AppProviders` — which
    [_layout.tsx](src/app/_layout.tsx) mounts only *after* `useAppBootstrap` reports ready. So
    react-query, `AppBackground`, and that hook all start after the splash has already revealed the
    screen; the `<Image>` began fetching/decoding at that moment. The prefetch was structurally
    always too late for the frame it existed to help. The first pass moved into
    [use-app-bootstrap.ts](src/hooks/use-app-bootstrap.ts), which is what holds the splash. The
    bundled asset is **awaited** via `Asset.loadAsync` and gated into `ready`; `prefetchBackgrounds`
    is **fire-and-forget** — the splash must never wait on the network (product decision). Neither
    lengthens the splash in practice: `MIN_SPLASH_MS` is already 900 ms and both run inside it.
  - **On a fresh install there was nothing to show at all** — the background URL lives *in* the
    app-content payload, so with no `aurelia/app-content.json` on disk the app didn't know what to
    ask for. Added `assets/images/backpu-time.png` +
    [fallback-background.ts](src/lib/app-content/fallback-background.ts) (one module, so the
    preloader and the renderer can't reference different assets).
    [page-background.tsx](src/components/page-background.tsx) now always renders an `<Image>`:
    fallback as `source` when no URL is known, and as `placeholder` under a remote photo that is
    still decoding. Also `cachePolicy="memory-disk"` so a re-mount doesn't decode from disk again.
  - ⚠️ **The fallback is a *light* image; the CMS photos are dark.** So `heroOnDark` on Home stays
    `Boolean(backgroundUrl)` — forcing it true (the obvious-looking simplification) would put white
    section titles on a near-white background while the fallback shows. The dark scrims in
    `PageBackground` stay gated on `uri` for the same reason. Worth re-reading before touching either.
  - **`expo-asset` promoted to a direct dependency** (57.0.6) — it was only a transitive dep of
    `expo`, which pnpm's strict `node_modules` does not make importable. `expo install` also appended
    `"expo-asset"` to `app.json` `plugins`; harmless with no options, but it is a native-config
    change, so the next build regenerates (CNG — `ios`/`android` are gitignored).
  - Asset re-encoded losslessly to drop a fully-opaque alpha channel: **954 KB → 646 KB**, verified
    pixel-identical. A JPEG q88 of the same image is **98 KB** with no visible banding — a further
    ~85% cut, left as the user's call since it is lossy and a brand asset.
  - `tsc --noEmit` clean; **158 tests** pass; lint at baseline (0 errors, 31 warnings).
  - ⏳ On-device verification pending (see §4) — the acceptance test is: uninstall → install → open,
    and the frame the splash reveals must already show the fallback, with the CMS photo crossfading in.

- **2026-07-17** — **Venue timezone, offline app content, and a perf/lint pass.** Outcome of a
  full-project review; no new features.
  - **Host availability now reads the venue's clock.** The server was computing `isAvailableNow` off
    its own UTC clock (see backend CLAUDE.md §11) — and the device clock would have been just as wrong,
    since visitors carry foreign zones. `remote.venueTimezone` now ships in release-config;
    [lib/host/availability.ts](src/lib/host/availability.ts) mirrors the server window logic on device
    (`venueWallClock` via `Intl` + `formatToParts` + `hourCycle: "h23"`), with a one-time
    `supportsTimezoneFormatting` probe that falls back to the **server's** value — never the device
    clock — if Hermes lacks `Intl` timezone data. `HostStatusChip` derives through the new
    [use-host-availability.ts](src/hooks/use-host-availability.ts) (1-minute local tick), and
    **`useHosts` lost its `refetchInterval: 30_000`** — that poll existed only to refresh a value now
    computed locally.
  - **App content survives a cold offline start.** react-query is memory-only here, so offline the app
    had no `assets` and therefore no background *URL* — the bytes were on disk all along (expo-image
    disk-caches by default). Added `aurelia/app-content.json` (plain JSON, mirroring
    [release-config/storage.ts](src/lib/release-config/storage.ts) exactly — the house pattern shared by
    entitlements/tour-reminder/spot-bookmarks), an `app-content-store` (disk-first `setContent`),
    hydration in `use-app-bootstrap`, and `useAppContent` seeding from the snapshot via `initialData`
    + **`initialDataUpdatedAt: 0`** so the background refresh still fires (without it the global 60s
    `staleTime` would suppress it). The snapshot carries its own `language`, so it hydrates
    independently of the concurrently-hydrating locale store. `useCachedAppContent` **deleted** (zero
    callers; the snapshot covers the offline case it was written for).
  - **Time-of-day backgrounds warm ahead + follow the venue.** New `enumerateBackgroundUrls`
    (de-duplicated — the fallback tiers are slot-independent, so a tenant may share one photo across
    slots) + [prefetch-backgrounds.ts](src/lib/app-content/prefetch-backgrounds.ts) using
    **`Image.prefetch`**: current slot awaited, other two fire-and-forget, failures non-fatal. No
    filesystem cache — that would duplicate expo-image (see §6). `getCurrentTimeOfDay(venueTimezone)`
    and `resolveAppBackgroundUrl(assets, slot)` are now venue-aware; `AppBackground` and Home pass the
    venue slot so they can't disagree.
  - **Navigation map stopped re-uploading the route every GPS tick.** GPS fires every ~2s, so
    `tour-map-view` re-renders ~30×/min; `splitRouteAtIndex` was unmemoized and the three
    `toLineFeature(...)` calls were inline in `data=`, handing MapLibre a new source identity — and the
    whole route across the bridge — every tick. All now memoized on what they actually depend on.
  - **Approach audio can no longer narrate the wrong stop.** `resolveInstalledMediaUri` had no
    cancellation guard, so passing two stops quickly could let a late-settling URI for the previous stop
    win. Resolution is now tagged with its spot id and *derived*, so a stale one simply stops matching.
  - **8 lint errors → 0**, fixed by restructuring rather than suppressing: refs written in effects not
    during render (`use-map-pack-ready`, `use-navigation-session`); the chat welcome seeded at mount and
    translated at render (which also fixed it never re-translating once the conversation started);
    `tour-prepare-screen` derives from installed prefs with a user-choice override (an async load can no
    longer clobber a choice the user just made); `useHostVisitorLocation` yields before touching state
    and gained a cancellation guard. Also deleted `use-version-sync` — it duplicated
    `use-release-config-sync`'s `appContentVersion` invalidation on the same query.
  - `tsc --noEmit` clean; **158 tests** (130 + 28).

- **2026-07-16** — **Reminder cadence is now admin-controlled (remote config).** The prep-reminder
 schedule was hard-coded on device (`PREP_OFFSET_DAYS = [3,2,1]`, 09:00). It now comes from the
 **`AppReleaseConfig` singleton** the admin already edits, so "koto din আগে + koyta reminder" is set
 in the panel, not shipped in a build. Three new remote-config fields:
 `reminderOffsetDays` (Json int[]), `reminderHour` (0–23), `reminderNudgeEnabled` (bool).
 - **Backend** (admin-and-server-aurelia): Prisma columns + migration
 `20260716120000_add_reminder_cadence_config` (**applied to Neon**), Zod validation
 (`reminderOffsetDays` ints 0–60, ≤10; hour 0–23), repository create/update + `REMOTE_CONFIG_FIELDS`
 (so a change bumps `remoteConfigVersion`), admin GET/PATCH responses, `types/app-content.ts`, and the
 **Remote config panel** gained a "Tour reminders" block (comma-separated days, hour, nudge toggle).
 Mobile bundle mapper normalizes offsets (whole days, dedupe, largest-first; garbage → `[3,2,1]`;
 empty = prep off).
 - **Mobile** (aurelia-app): `RemoteConfig` + defaults carry the three fields;
 [schedule-math.ts](src/lib/tour-reminder/schedule-math.ts) is now cadence-driven
 (`normalizePrepOffsets`/`normalizeReminderHour`, `computePrepTriggers(date, now, offsets, hour)`),
 and the **schedule key includes the cadence** so an admin change reschedules on the next sync.
 [scheduler.ts](src/lib/tour-reminder/scheduler.ts) reads the synced remote config, uses `reminderHour`
 for both prep DATE triggers and the DAILY nudge, gates the nudge on `reminderNudgeEnabled`, and now
 **cancels by querying `getAllScheduledNotificationsAsync()`** (prefix `prep:{tourId}:`) so changing
 the offset set clears stale identifiers it no longer emits. Prep copy is generic: D-1 = "tomorrow",
 D-0 = "today", else `reminder.prep.body.generic` ("{days} days"); en/es/fr added. `tsc` clean both
 repos; **130 mobile tests** (+8), **163 backend tests**. ⚠️ Cadence changes reach a device only after
 it syncs release-config (version bump on foreground) — offline devices keep the last-synced cadence.

- **2026-07-16** — **Home premium cards restyled (Find Host / Reminders / Unlock).** Feature tiles and
 the signed-out unlock banner moved to a single gold-washed dark surface (`#2a2118`→`#0f0d0b`), gold
 hairline, top rim, and a reanimated sweeping-light sheen (`expo-linear-gradient`, no Skia canvas —
 the Skia `Canvas` painted an opaque white box on Android). New
 [premium-unlock-card.tsx](src/components/home/premium-unlock-card.tsx) replaces the tall stacked
 GlassCard with a compact ~78px row (icon · title/subtitle · gold "Unlock" CTA). `home.premiumCta`
 string added (en/es/fr).

- **2026-07-16** — **Smart Tour Reminder v1 (local prep notifications).** New feature: each entitled
  tour can carry a planned visit date; the app schedules local prep reminders at **09:00 device-local
  on D-3 / D-2 / D-1** and, for undated tours the buyer skipped, a daily "set a date" nudge. **Local
  notifications only** (`expo-notifications` 57, no push server); `@react-native-community/datetimepicker`
  9 added for the date/time picker. **Native rebuild required** — both are config-plugin deps; ran
  `expo prebuild` (CNG, `ios`/`android` are gitignored) + `pod install`; a fresh dev-client build is
  needed on device/simulator before testing.
  - **Data flow:** backend now sends `tourDate`/`startTime` per tour on `/auth/unlock` + `/me/entitlements`
    (see admin repo changelog). `UnlockResult`/`Entitlements` tours in [types/auth.ts](src/types/auth.ts)
    carry them. Local state lives in a new store [tour-reminder-store.ts](src/store/tour-reminder-store.ts)
    + [lib/tour-reminder/storage.ts](src/lib/tour-reminder/storage.ts) (expo-file-system JSON at
    `document/aurelia/tour-reminders.json`, mirroring entitlements), hydrated in
    [use-app-bootstrap.ts](src/hooks/use-app-bootstrap.ts) (which also fires a cold-start
    `rescheduleAllReminders()` so TZ/clock drift self-heals), cleared on sign-out.
  - **Precedence:** admin dates seed local state **unless** the buyer overrode it (`userOverridden`);
    the buyer's date always wins. Sync runs inside `fetchAndPersistEntitlements`
    ([entitlements/refresh.ts](src/lib/entitlements/refresh.ts)) — the single seam covering unlock +
    refresh — via [lib/tour-reminder/sync.ts](src/lib/tour-reminder/sync.ts). Reminder triggers key off
    `tourDate == null`, **not** Stripe success (self-purchase buyers unlock first, so this covers them).
  - **Scheduling:** pure, unit-tested math in [schedule-math.ts](src/lib/tour-reminder/schedule-math.ts)
    (D-3/D-2/D-1 at 09:00 local, skip-past, `scheduleKey` fingerprint incl. TZ offset for no-dup
    resyncs); OS glue in [scheduler.ts](src/lib/tour-reminder/scheduler.ts) (stable identifiers
    `prep:{tourId}:d{n}` / `nudge:{tourId}:daily`, `DATE` one-shots + `DAILY` nudge, Android channel
    `tour-reminders`). Scheduling is a **no-op without notification permission**, so sync never prompts.
  - **UX:** Set Tour Date modal [set-tour-date-modal.tsx](src/components/tour-reminder/set-tour-date-modal.tsx)
    is the **JIT permission moment** — the OS prompt fires only on a deliberate "Set reminders", same
    pattern as the location `LocationPermissionPrimer`. [tour-reminder-gate.tsx](src/components/tour-reminder/tour-reminder-gate.tsx)
    shows it once/session for the first undated tour; [tour-reminder-listener.tsx](src/components/tour-reminder/tour-reminder-listener.tsx)
    routes a tapped prep reminder → new **visit-checklist** screen
    [tour/[tourId]/visit-checklist.tsx](src/app/tour/[tourId]/visit-checklist.tsx) (persisted checklist
    toggles + Open/Download CTA), and a nudge → Settings. Both mounted in
    [_layout.tsx](src/app/_layout.tsx). Per-tour date editing in
    [tour-date-settings-panel.tsx](src/components/settings/tour-date-settings-panel.tsx) (Settings).
    ⚠️ Named **visit-checklist**, not `prepare`, to avoid colliding with the existing
    `tour/[tourId]/prepare.tsx` download screen. en/es/fr copy added. `tsc` clean; **122 tests** (12 new).

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
