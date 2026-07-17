import {
  Camera,
  GeoJSONSource,
  Layer,
  LocationManager,
  Map,
  Marker,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { FootprintMarker } from "@/components/navigation/footprint-overlay";
import { StopCallout } from "@/components/navigation/stop-callout";
import { StopPin } from "@/components/navigation/stop-pin";
import { useStrings } from "@/hooks/use-strings";
import { getFloorScope } from "@/lib/bundle/floor-routing";
import {
  MAP_CAMERA_PADDING,
  getRouteMapBounds,
  mapBoundsToLngLatBounds,
  mergeBoundsWithPoint,
} from "@/lib/map/camera";
import { getFallbackMapStyleObject, getTourMapStyleObject } from "@/lib/map/style";
import type { NavigationSessionSnapshot } from "@/lib/navigation/process-location-update";
import {
  buildRouteCoordinates,
  splitRouteAtIndex,
} from "@/lib/navigation/route-geometry";
import type { BundleContent, BundleSpot, GeoPoint } from "@/types/bundle-content";

const CAMERA_FOLLOW_MS = 320;
/**
 * How many times to silently remount the map after a style-load failure before
 * surfacing the manual refresh. The final attempt swaps to the glyph/sprite-free
 * fallback style so overlays still render offline.
 */
const MAX_STYLE_RETRIES = 2;

type TourMapViewProps = {
  tourId: string;
  content: BundleContent;
  /** The floor on show. Omitted means the tour's first (or only) floor. */
  floorId?: string;
  orderedSpots: BundleSpot[];
  snapshot: NavigationSessionSnapshot | null;
  /** Localized stop names keyed by spot id, used in the tap popup. */
  stopTitleById?: Record<string, string>;
  onLoadError?: () => void;
};

/** A stop with valid coordinates, plus its 1-based label along the route. */
type StopPinModel = {
  spot: BundleSpot;
  label: number;
  isStart: boolean;
};

function buildStopPins(spots: BundleSpot[]): StopPinModel[] {
  return spots
    .filter((spot) => spot.latitude !== null && spot.longitude !== null)
    .map((spot, index) => ({ spot, label: index + 1, isStart: index === 0 }));
}

function toLineFeature(coordinates: GeoPoint[], id: string) {
  return {
    type: "Feature" as const,
    properties: { id },
    geometry: {
      type: "LineString" as const,
      coordinates: coordinates.map((point) => [point.lng, point.lat]),
    },
  };
}

function toTrailStepFeatures(trail: GeoPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: trail.map((point, index) => ({
      type: "Feature" as const,
      properties: { index },
      geometry: {
        type: "Point" as const,
        coordinates: [point.lng, point.lat],
      },
    })),
  };
}

function getDisplayLocation(snapshot: NavigationSessionSnapshot | null) {
  const point = snapshot?.displayLocation ?? snapshot?.rawLocation;
  if (!point) {
    return null;
  }

  return {
    ...point,
    bearing: snapshot?.displayBearing ?? 0,
  };
}

function toUserFeature(location: GeoPoint) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [location.lng, location.lat],
    },
  };
}

export function TourMapView({
  tourId,
  content,
  floorId,
  orderedSpots,
  snapshot,
  stopTitleById,
  onLoadError,
}: TourMapViewProps) {
  const router = useRouter();
  const { t } = useStrings();
  const cameraRef = useRef<CameraRef>(null);
  const mapReadyRef = useRef(false);
  const initialTourFitRef = useRef(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const styleRetryRef = useRef(0);
  const [styleAttempt, setStyleAttempt] = useState(0);

  const routeCoordinates = useMemo(() => {
    const scope = getFloorScope(content, floorId);
    return buildRouteCoordinates(scope.spots, scope.route);
  }, [content, floorId]);
  const tourBounds = useMemo(
    () => getRouteMapBounds(routeCoordinates),
    [routeCoordinates],
  );
  const initialViewState = useMemo(() => {
    if (!tourBounds) {
      return undefined;
    }

    return {
      bounds: mapBoundsToLngLatBounds(tourBounds),
      padding: MAP_CAMERA_PADDING,
      zoom: 15,
    };
  }, [tourBounds]);

  const routeIndex = snapshot?.snappedLocation?.routeIndex ?? 0;
  // GPS ticks every ~2s, so this component re-renders ~30x/min while walking.
  // Rebuilding these GeoJSON objects each time handed MapLibre a new source
  // identity every tick and re-uploaded the whole route across the bridge, even
  // when the geometry hadn't moved. Memoized on what they actually depend on.
  const { completed, upcoming } = useMemo(
    () => splitRouteAtIndex(routeCoordinates, routeIndex),
    [routeCoordinates, routeIndex],
  );
  const completedFeature = useMemo(
    () => toLineFeature(completed, "completed"),
    [completed],
  );
  const upcomingFeature = useMemo(
    () => toLineFeature(upcoming, "upcoming"),
    [upcoming],
  );
  const displayLocation = getDisplayLocation(snapshot);
  const walkTrail = useMemo(() => snapshot?.walkTrail ?? [], [snapshot]);
  const trailFeature = useMemo(
    () => toLineFeature(walkTrail, "walk-trail"),
    [walkTrail],
  );
  const trailSteps = useMemo(
    () => toTrailStepFeatures(walkTrail),
    [walkTrail],
  );

  const stopPins = useMemo(() => buildStopPins(orderedSpots), [orderedSpots]);
  const selectedPin = useMemo(
    () => stopPins.find((pin) => pin.spot.id === selectedStopId) ?? null,
    [stopPins, selectedStopId],
  );
  // Offline-safe inline style (no sprite/glyph fetches). Retries swap to the
  // minimal fallback if tile attachment is still slow on cold start.
  const mapStyle = useMemo(
    () =>
      styleAttempt >= MAX_STYLE_RETRIES
        ? getFallbackMapStyleObject()
        : getTourMapStyleObject(),
    [styleAttempt],
  );

  const openSelectedStopDetails = useCallback(() => {
    if (!selectedPin) {
      return;
    }
    setSelectedStopId(null);
    router.push(`/tour/${tourId}/spot/${selectedPin.spot.id}`);
  }, [router, selectedPin, tourId]);

  const fitTourArea = useCallback(
    (includeUser = false) => {
      if (!tourBounds || !cameraRef.current) {
        return;
      }

      let bounds = tourBounds;

      if (includeUser && displayLocation) {
        bounds = mergeBoundsWithPoint(bounds, displayLocation);
      }

      cameraRef.current.fitBounds(mapBoundsToLngLatBounds(bounds), {
        padding: MAP_CAMERA_PADDING,
        duration: includeUser ? 900 : 0,
      });
    },
    [displayLocation, tourBounds],
  );

  useEffect(() => {
    void LocationManager.requestPermissions();
  }, []);

  useEffect(() => {
    if (!mapReadyRef.current || !initialTourFitRef.current || !displayLocation) {
      return;
    }

    cameraRef.current?.easeTo({
      center: [displayLocation.lng, displayLocation.lat],
      zoom: 16,
      duration: CAMERA_FOLLOW_MS,
    });
  }, [displayLocation]);

  const isMoving =
    snapshot?.status === "tracking" || snapshot?.status === "offRoute";

  return (
    <View style={styles.container}>
      <Map
        key={styleAttempt}
        style={styles.map}
        mapStyle={mapStyle}
        {...(Platform.OS === "android" ? { androidView: "texture" as const } : {})}
        dragPan
        touchZoom
        touchRotate={false}
        touchPitch={false}
        attribution={false}
        onPress={() => setSelectedStopId(null)}
        onDidFinishLoadingMap={() => {
          styleRetryRef.current = 0;
          mapReadyRef.current = true;
          fitTourArea(Boolean(displayLocation));
          initialTourFitRef.current = true;
        }}
        onDidFailLoadingMap={() => {
          // Offline, a missing base style/tiles leaves a blank map and the
          // footprint layers never attach. Auto-retry a few times (remount via
          // the key; the last attempt uses the fallback style) before surfacing
          // the manual refresh, so the user no longer has to restart the app.
          if (styleRetryRef.current < MAX_STYLE_RETRIES) {
            styleRetryRef.current += 1;
            const attempt = styleRetryRef.current;
            setTimeout(() => setStyleAttempt((n) => n + 1), 300 * attempt);
            return;
          }
          onLoadError?.();
        }}
      >
        <Camera ref={cameraRef} initialViewState={initialViewState} />

        {walkTrail.length >= 2 ? (
          <GeoJSONSource id="walk-trail" data={trailFeature}>
            <Layer
              id="walk-trail-line"
              type="line"
              style={{
                lineColor: "rgba(225, 165, 102, 0.82)",
                lineWidth: 4,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </GeoJSONSource>
        ) : null}

        {walkTrail.length > 0 ? (
          <GeoJSONSource id="walk-trail-steps" data={trailSteps}>
            <Layer
              id="walk-trail-step-circles"
              type="circle"
              style={{
                circleRadius: 3.5,
                circleColor: "rgba(225, 165, 102, 0.55)",
                circleStrokeColor: "rgba(255, 243, 199, 0.9)",
                circleStrokeWidth: 1,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {completed.length >= 2 ? (
          <GeoJSONSource id="completed-route" data={completedFeature}>
            <Layer
              id="completed-route-line"
              type="line"
              style={{
                lineColor: "rgba(225, 165, 102, 0.35)",
                lineWidth: 5,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </GeoJSONSource>
        ) : null}

        {upcoming.length >= 2 ? (
          <GeoJSONSource id="upcoming-route" data={upcomingFeature}>
            <Layer
              id="upcoming-route-line"
              type="line"
              style={{
                lineColor: "#e1a566",
                lineWidth: 6,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </GeoJSONSource>
        ) : null}

        {stopPins.map((pin) => (
          <Marker
            key={pin.spot.id}
            id={`stop-${pin.spot.id}`}
            lngLat={[pin.spot.longitude!, pin.spot.latitude!]}
            anchor="bottom"
            onPress={() => setSelectedStopId(pin.spot.id)}
          >
            <View style={styles.stopPinHitArea}>
              <StopPin
                label={pin.label}
                isStart={pin.isStart}
                selected={pin.spot.id === selectedStopId}
              />
            </View>
          </Marker>
        ))}

        {selectedPin ? (
          <Marker
            id={`stop-callout-${selectedPin.spot.id}`}
            lngLat={[selectedPin.spot.longitude!, selectedPin.spot.latitude!]}
            anchor="bottom"
            offset={[0, -54]}
          >
            <StopCallout
              label={selectedPin.label}
              title={stopTitleById?.[selectedPin.spot.id] ?? `#${selectedPin.label}`}
              viewDetailsLabel={t("nav.viewDetails")}
              onViewDetails={openSelectedStopDetails}
              onClose={() => setSelectedStopId(null)}
            />
          </Marker>
        ) : null}

        {displayLocation ? (
          <>
            <GeoJSONSource
              id="user-position"
              data={toUserFeature(displayLocation)}
            >
              <Layer
                id="user-position-accuracy"
                type="circle"
                style={{
                  circleRadius: 14,
                  circleColor: "rgba(225, 165, 102, 0.18)",
                  circleStrokeColor: "rgba(225, 165, 102, 0.45)",
                  circleStrokeWidth: 1,
                }}
              />
              <Layer
                id="user-position-dot"
                type="circle"
                style={{
                  circleRadius: 7,
                  circleColor: "#e1a566",
                  circleStrokeColor: "#ffffff",
                  circleStrokeWidth: 2,
                }}
              />
            </GeoJSONSource>

            <Marker
              id="user-footprint"
              lngLat={[displayLocation.lng, displayLocation.lat]}
              anchor="center"
            >
              <FootprintMarker
                bearing={displayLocation.bearing}
                moving={isMoving}
              />
            </Marker>
          </>
        ) : null}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  stopPinHitArea: {
    padding: 10,
    alignItems: "center",
  },
});
