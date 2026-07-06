import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useStrings } from "@/hooks/use-strings";
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
import type { RawGpsFix } from "@/lib/navigation/types";

type UseNavigationSessionOptions = {
  tourId: string;
  content: BundleContent | undefined;
  enabled?: boolean;
  onApproachSpot?: (spotId: string) => void;
  onArriveSpot?: (spotId: string) => void;
};

const NO_COMPLETED_SPOTS: string[] = [];

function toGpsFix(position: Location.LocationObject): RawGpsFix {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    heading: position.coords.heading,
    speed: position.coords.speed,
    timestamp: position.timestamp,
  };
}

function handleLocationResult(
  result: LocationUpdateResult,
  input: {
    tourId: string;
    markSpotComplete: (tourId: string, spotId: string) => Promise<void>;
    onApproachSpot?: (spotId: string) => void;
    onArriveSpot?: (spotId: string) => void;
    voiceEnabled: boolean;
    offRouteMessage: string;
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
    input.onArriveSpot?.(result.arrivedSpotId);
  }
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
  contentRef.current = content;

  const canNavigate =
    enabled &&
    remote.enableGpsNavigation &&
    content &&
    hasNavigationGeoData(content);

  useEffect(() => {
    setCompletedSpotIds(completedSpotIds);
  }, [completedSpotIds, setCompletedSpotIds]);

  useEffect(() => {
    if (!canNavigate || !contentRef.current) {
      return;
    }

    let cancelled = false;
    const activeContent = contentRef.current;

    async function startTracking() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted" || cancelled) {
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

      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!cancelled) {
          const bootstrapResult = ingestBootstrapFix(toGpsFix(initial));
          if (bootstrapResult) {
            handleLocationResult(bootstrapResult, {
              tourId,
              markSpotComplete,
              onApproachSpot,
              onArriveSpot,
              voiceEnabled: remote.enableVoiceGuidance,
              offRouteMessage: t("nav.offRouteVoice"),
              language,
            });
          }
        }
      } catch {
        // Continue with watchPosition even if the first fix fails.
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500,
          distanceInterval: 1,
        },
        (position) => {
          const result = ingestFix(toGpsFix(position));

          if (!result) {
            return;
          }

          handleLocationResult(result, {
            tourId,
            markSpotComplete,
            onApproachSpot,
            onArriveSpot,
            voiceEnabled: remote.enableVoiceGuidance,
            offRouteMessage: t("nav.offRouteVoice"),
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
      appStateSubscription.remove();
      reset();
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

  return {
    canNavigate: Boolean(canNavigate),
    snapshot,
    isTracking,
  };
}
