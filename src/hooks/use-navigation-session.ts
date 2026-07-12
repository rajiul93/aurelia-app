import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useStrings } from "@/hooks/use-strings";
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
import type { LocationUpdateResult } from "@/lib/navigation/process-location-update";
import { hasNavigationGeoData } from "@/lib/navigation/validate-geo";
import { orderSpotsByRoute } from "@/lib/bundle/route-order";
import { useNavigationSessionStore } from "@/store/navigation-session-store";
import { useRemoteConfig } from "@/store/release-config-store";
import { useLocaleStore } from "@/store/locale-store";
import { useTourProgressStore } from "@/store/tour-progress-store";
import type { BundleContent } from "@/types/bundle-content";

type UseNavigationSessionOptions = {
  tourId: string;
  content: BundleContent | undefined;
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

function hasLocationFix(
  snapshot: ReturnType<
    typeof useNavigationSessionStore.getState
  >["snapshot"],
) {
  return Boolean(snapshot?.displayLocation ?? snapshot?.rawLocation);
}

export function useNavigationSession({
  tourId,
  content,
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
  const contentRef = useRef(content);
  const [locationStatus, setLocationStatus] =
    useState<NavigationLocationStatus>("pending");
  const [locationTimedOut, setLocationTimedOut] = useState(false);
  contentRef.current = content;

  // Navigation is available for any installed tour with usable geo data. The
  // enableGpsNavigation remote flag no longer gates offline navigation; voice
  // still respects enableVoiceGuidance below.
  const canNavigate =
    enabled && content && hasNavigationGeoData(content);

  useEffect(() => {
    setCompletedSpotIds(completedSpotIds);
  }, [completedSpotIds, setCompletedSpotIds]);

  useEffect(() => {
    if (!canNavigate || hasLocationFix(snapshot)) {
      setLocationTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setLocationTimedOut(true);
    }, 15_000);

    return () => clearTimeout(timeoutId);
  }, [canNavigate, snapshot]);

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

      const orderedSpots = orderSpotsByRoute(
        activeContent.tour.spots,
        activeContent.route,
      );
      const routeCoordinates = buildRouteCoordinates(
        activeContent.tour.spots,
        activeContent.route,
      );

      startSession({
        tourId,
        routeCoordinates,
        orderedSpots,
        completedSpotIds,
      });

      const initial = await resolveBootstrapLocation();

      if (!cancelled && initial) {
        const bootstrapResult = ingestBootstrapFix(toGpsFix(initial));
        if (bootstrapResult) {
          setLocationStatus("ready");
          handleLocationResult(bootstrapResult, {
            tourId,
            markSpotComplete,
            onApproachSpot,
            onArriveSpot,
            voiceEnabled: remote.enableVoiceGuidance,
            offRouteMessage: t("nav.offRouteVoice"),
            arrivedMessage: t("nav.arrivedVoice"),
            language,
          });
        }
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2_000,
          distanceInterval: 5,
        },
        (position) => {
          const result = ingestFix(toGpsFix(position));

          if (!result) {
            return;
          }

          setLocationStatus("ready");

          handleLocationResult(result, {
            tourId,
            markSpotComplete,
            onApproachSpot,
            onArriveSpot,
            voiceEnabled: remote.enableVoiceGuidance,
            offRouteMessage: t("nav.offRouteVoice"),
            arrivedMessage: t("nav.arrivedVoice"),
            language,
          });
        },
      );
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
      appStateSubscription.remove();
      reset();
      setLocationStatus("pending");
    };
  }, [
    canNavigate,
    ingestBootstrapFix,
    ingestFix,
    language,
    markSpotComplete,
    onApproachSpot,
    onArriveSpot,
    remote.enableVoiceGuidance,
    reset,
    startSession,
    stopSession,
    t,
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
