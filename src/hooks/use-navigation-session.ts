import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useStrings } from "@/hooks/use-strings";
import { resetApproachVoice } from "@/lib/navigation/approach-voice";
import {
  resetArrivalVoice,
  speakArrival,
} from "@/lib/navigation/arrival-voice";
import {
  resolveBootstrapLocation,
  toGpsFix,
} from "@/lib/navigation/bootstrap-location";
import {
  resetOffRouteVoiceCooldown,
  speakOffRouteWarning,
  stopOffRouteWarning,
} from "@/lib/navigation/off-route-voice";
import { buildRouteCoordinates } from "@/lib/navigation/route-geometry";
import {
  hasLocationFix,
  type LocationUpdateResult,
} from "@/lib/navigation/process-location-update";
import { hasNavigationGeoData } from "@/lib/navigation/validate-geo";
import { getFloorScope } from "@/lib/bundle/floor-routing";
import { orderSpotsByRoute } from "@/lib/bundle/route-order";
import { useNavigationSessionStore } from "@/store/navigation-session-store";
import { useRemoteConfig } from "@/store/release-config-store";
import { useLocaleStore } from "@/store/locale-store";
import { useTourProgressStore } from "@/store/tour-progress-store";
import type { BundleContent } from "@/types/bundle-content";

type UseNavigationSessionOptions = {
  tourId: string;
  content: BundleContent | undefined;
  /** The floor being walked. Omitted means the tour's first (or only) floor. */
  floorId?: string;
  enabled?: boolean;
  onApproachSpot?: (spotId: string) => void;
  onArriveSpot?: (spotId: string) => void;
};

export type NavigationLocationStatus = "pending" | "ready" | "denied";

const NO_COMPLETED_SPOTS: string[] = [];

function handleLocationResult(
  result: LocationUpdateResult,
  input: {
    tourId: string;
    markSpotComplete: (tourId: string, spotId: string) => Promise<void>;
    onApproachSpot?: (spotId: string) => void;
    onArriveSpot?: (spotId: string) => void;
    voiceEnabled: boolean;
    offRouteMessage: string;
    arrivedMessage: string;
    language: string;
  },
) {
  if (result.shouldTriggerOffRouteVoice && input.voiceEnabled) {
    speakOffRouteWarning(input.offRouteMessage, input.language);
  }

  if (result.snapshot.status !== "offRoute") {
    stopOffRouteWarning();
  }

  if (result.shouldTriggerApproachAudio) {
    const triggeredSpotId = result.internals.approachAudioTriggeredForSpotId;
    if (triggeredSpotId) {
      input.onApproachSpot?.(triggeredSpotId);
    }
  }

  if (result.shouldMarkArrived && result.arrivedSpotId) {
    void input.markSpotComplete(input.tourId, result.arrivedSpotId);
    if (input.voiceEnabled) {
      speakArrival(result.arrivedSpotId, input.arrivedMessage, input.language);
    }
    input.onArriveSpot?.(result.arrivedSpotId);
  }
}

export function useNavigationSession({
  tourId,
  content,
  floorId,
  enabled = true,
  onApproachSpot,
  onArriveSpot,
}: UseNavigationSessionOptions) {
  const remote = useRemoteConfig();
  const language = useLocaleStore((state) => state.language);
  const { t } = useStrings();
  const completedSpotIds = useTourProgressStore(
    (state) => state.byTourId[tourId]?.completedSpotIds ?? NO_COMPLETED_SPOTS,
  );
  const markSpotComplete = useTourProgressStore((state) => state.markSpotComplete);
  const startSession = useNavigationSessionStore((state) => state.startSession);
  const stopSession = useNavigationSessionStore((state) => state.stopSession);
  const setCompletedSpotIds = useNavigationSessionStore(
    (state) => state.setCompletedSpotIds,
  );
  const ingestBootstrapFix = useNavigationSessionStore(
    (state) => state.ingestBootstrapFix,
  );
  const ingestFix = useNavigationSessionStore((state) => state.ingestFix);
  const reset = useNavigationSessionStore((state) => state.reset);
  const snapshot = useNavigationSessionStore((state) => state.snapshot);
  const isTracking = useNavigationSessionStore((state) => state.isTracking);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  // Everything handleLocationResult needs that is *not* a reason to restart GPS.
  // These churn for unrelated reasons — `t` changes whenever the app-content
  // query returns a new object, the voice flag with any remote-config sync — and
  // listing them as effect dependencies tore down the session, whose cleanup
  // calls reset() and so wiped the user's position mid-walk. Written in an
  // effect, not during render (unsafe under concurrent rendering).
  const handlersRef = useRef({
    tourId,
    markSpotComplete,
    onApproachSpot,
    onArriveSpot,
    voiceEnabled: remote.enableVoiceGuidance,
    offRouteMessage: "",
    arrivedMessage: "",
    language,
  });
  // Kept in a ref so the tracking effect can read the latest content without
  // depending on it — content's identity churns on query refresh, and
  // re-subscribing to GPS on every churn would drop the fix. Written in an
  // effect, not during render, which is unsafe under concurrent rendering.
  const contentRef = useRef(content);
  const [locationStatus, setLocationStatus] =
    useState<NavigationLocationStatus>("pending");
  const [locationTimedOut, setLocationTimedOut] = useState(false);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    handlersRef.current = {
      tourId,
      markSpotComplete,
      onApproachSpot,
      onArriveSpot,
      voiceEnabled: remote.enableVoiceGuidance,
      offRouteMessage: t("nav.offRouteVoice"),
      arrivedMessage: t("nav.arrivedVoice"),
      language,
    };
  }, [
    language,
    markSpotComplete,
    onApproachSpot,
    onArriveSpot,
    remote.enableVoiceGuidance,
    t,
    tourId,
  ]);

  // Navigation is available for any installed tour with usable geo data. The
  // enableGpsNavigation remote flag no longer gates offline navigation; voice
  // still respects enableVoiceGuidance below.
  const canNavigate =
    enabled && content && hasNavigationGeoData(content, floorId);

  useEffect(() => {
    setCompletedSpotIds(completedSpotIds);
  }, [completedSpotIds, setCompletedSpotIds]);

  // True only while we are actually waiting on a first fix. Derived rather than
  // stored so it can't drift from canNavigate/snapshot.
  const waitingForFix = Boolean(canNavigate) && !hasLocationFix(snapshot);

  useEffect(() => {
    if (!waitingForFix) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setLocationTimedOut(true);
    }, 15_000);

    return () => {
      clearTimeout(timeoutId);
      // Leaving this wait — a fix arrived, or navigation stopped. The next wait
      // must serve its own 15 seconds rather than inherit this one's verdict,
      // or losing a fix mid-walk would flash "no GPS" instantly.
      setLocationTimedOut(false);
    };
  }, [waitingForFix]);

  useEffect(() => {
    if (!canNavigate || !contentRef.current) {
      setLocationStatus("pending");
      return;
    }

    let cancelled = false;
    const activeContent = contentRef.current;

    async function startTracking() {
      setLocationStatus("pending");

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        if (!cancelled) {
          setLocationStatus("denied");
        }
        return;
      }

      const scope = getFloorScope(activeContent, floorId);
      const orderedSpots = orderSpotsByRoute(scope.spots, scope.route);
      const routeCoordinates = buildRouteCoordinates(scope.spots, scope.route);

      startSession({
        tourId,
        routeCoordinates,
        orderedSpots,
        completedSpotIds,
      });

      // Fire-and-forget, deliberately not awaited. Resolving a first fix can
      // take seconds (a cold device has no last-known position, so it falls
      // through to a live fix with a timeout) and the watch below used to sit
      // behind it — leaving a window with no subscription at all, during which
      // any fix that arrived had nobody to receive it.
      //
      // Racing the watch is safe because ingestBootstrapFix refuses to apply
      // once a real fix has landed; see the guard in navigation-session-store.
      void resolveBootstrapLocation().then((initial) => {
        if (cancelled || !initial) {
          return;
        }

        const bootstrapResult = ingestBootstrapFix(toGpsFix(initial));
        if (!bootstrapResult) {
          return;
        }

        setLocationStatus("ready");
        handleLocationResult(bootstrapResult, handlersRef.current);
      });

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1_000,
          // No distance gate. At 5 m a user standing still — which is exactly
          // what someone who just opened the map from a spot page is doing —
          // received no updates at all, so the marker never appeared.
          distanceInterval: 0,
        },
        (position) => {
          const result = ingestFix(toGpsFix(position));

          if (!result) {
            return;
          }

          setLocationStatus("ready");

          handleLocationResult(result, handlersRef.current);
        },
      );

      // The effect may have been cleaned up while we awaited the subscription;
      // its cleanup already ran, so nothing else will remove this one.
      if (cancelled) {
        subscription.remove();
        return;
      }

      subscriptionRef.current = subscription;
    }

    void startTracking();

    const appStateSubscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") {
        stopSession();
        subscriptionRef.current?.remove();
        subscriptionRef.current = null;
        stopOffRouteWarning();
        return;
      }

      if (!subscriptionRef.current) {
        void startTracking();
      }
    });

    return () => {
      cancelled = true;
      stopSession();
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      stopOffRouteWarning();
      resetOffRouteVoiceCooldown();
      resetArrivalVoice();
      resetApproachVoice();
      appStateSubscription.remove();
      reset();
      setLocationStatus("pending");
    };
    // Only what genuinely warrants tearing down GPS and starting over: a
    // different tour, a different floor (different route), or navigation
    // becoming (un)available. The rest reaches the callbacks through
    // handlersRef. The zustand actions below are stable for the store's
    // lifetime, so they never trigger a restart.
  }, [
    canNavigate,
    floorId,
    ingestBootstrapFix,
    ingestFix,
    reset,
    startSession,
    stopSession,
    tourId,
  ]);

  const hasFix = hasLocationFix(snapshot);

  return {
    canNavigate: Boolean(canNavigate),
    snapshot,
    isTracking,
    locationStatus,
    hasLocationFix: hasFix,
    isAwaitingLocation:
      canNavigate &&
      locationStatus !== "denied" &&
      !hasFix &&
      !locationTimedOut,
  };
}
