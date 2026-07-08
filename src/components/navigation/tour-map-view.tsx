import {
  Camera,
  GeoJSONSource,
  Layer,
  LocationManager,
  Map,
  Marker,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { FootprintOverlay } from "@/components/navigation/footprint-overlay";
import { StopCallout } from "@/components/navigation/stop-callout";
import { StopPin } from "@/components/navigation/stop-pin";
import { useStrings } from "@/hooks/use-strings";
import {
  MAP_CAMERA_PADDING,
  getRouteMapBounds,
  mapBoundsToLngLatBounds,
  mergeBoundsWithPoint,
} from "@/lib/map/camera";
import { getTourMapStyle } from "@/lib/map/style";
import type { NavigationSessionSnapshot } from "@/lib/navigation/process-location-update";
import {
  buildRouteCoordinates,
  splitRouteAtIndex,
} from "@/lib/navigation/route-geometry";
import type { BundleContent, BundleSpot, GeoPoint } from "@/types/bundle-content";

const CAMERA_FOLLOW_MS = 320;

type TourMapViewProps = {
  tourId: string;
  content: BundleContent;
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
  orderedSpots,
  snapshot,
  stopTitleById,
  onLoadError,
}: TourMapViewProps) {
  const router = useRouter();
  const { t } = useStrings();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const mapReadyRef = useRef(false);
  const initialTourFitRef = useRef(false);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [footprintPoint, setFootprintPoint] = useState({ x: 0, y: 0 });
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const routeCoordinates = useMemo(
    () => buildRouteCoordinates(content.tour.spots, content.route),
    [content],
  );
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
  const { completed, upcoming } = splitRouteAtIndex(
    routeCoordinates,
    routeIndex,
  );
  const displayLocation = getDisplayLocation(snapshot);
  const walkTrail = snapshot?.walkTrail ?? [];
  const trailSteps = useMemo(
    () => toTrailStepFeatures(walkTrail),
    [walkTrail],
  );

  const stopPins = useMemo(() => buildStopPins(orderedSpots), [orderedSpots]);
  const selectedPin = useMemo(
    () => stopPins.find((pin) => pin.spot.id === selectedStopId) ?? null,
    [stopPins, selectedStopId],
  );
  const mapStyle = useMemo(() => getTourMapStyle(), []);

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

  const updateFootprintPoint = useCallback(async () => {
    const location = getDisplayLocation(snapshot);
    if (!location || !mapRef.current) {
      return;
    }

    try {
      const point = await mapRef.current.project([location.lng, location.lat]);
      setFootprintPoint({ x: point[0], y: point[1] });
    } catch {
      // Ignore projection errors while the map is still initializing.
    }
  }, [snapshot]);

  useEffect(() => {
    void updateFootprintPoint();
  }, [snapshot, updateFootprintPoint]);

  useEffect(() => {
    void LocationManager.requestPermissions();
  }, []);

  useEffect(() => {
    if (!mapReadyRef.current || !initialTourFitRef.current || !displayLocation) {
      return;
    }

    void updateFootprintPoint();

    cameraRef.current?.easeTo({
      center: [displayLocation.lng, displayLocation.lat],
      zoom: 16,
      duration: CAMERA_FOLLOW_MS,
    });
  }, [displayLocation, updateFootprintPoint]);

  const isMoving =
    snapshot?.status === "tracking" || snapshot?.status === "offRoute";

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        setLayout({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        });
      }}
    >
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={mapStyle}
        dragPan
        touchZoom
        touchRotate={false}
        touchPitch={false}
        attribution={false}
        onPress={() => setSelectedStopId(null)}
        onDidFinishLoadingMap={() => {
          mapReadyRef.current = true;
          fitTourArea(Boolean(displayLocation));
          initialTourFitRef.current = true;
          void updateFootprintPoint();
        }}
        onDidFailLoadingMap={() => {
          // Offline, a missing base style/tiles leaves a blank map and the
          // footprint layers never attach. Surface it so the caller can retry.
          onLoadError?.();
        }}
        onRegionDidChange={() => {
          void updateFootprintPoint();
        }}
      >
        <Camera ref={cameraRef} initialViewState={initialViewState} />

        {walkTrail.length >= 2 ? (
          <GeoJSONSource id="walk-trail" data={toLineFeature(walkTrail, "walk-trail")}>
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
          <GeoJSONSource
            id="completed-route"
            data={toLineFeature(completed, "completed")}
          >
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
          <GeoJSONSource
            id="upcoming-route"
            data={toLineFeature(upcoming, "upcoming")}
          >
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
            <StopPin
              label={pin.label}
              isStart={pin.isStart}
              selected={pin.spot.id === selectedStopId}
            />
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
        ) : null}
      </Map>

      {displayLocation ? (
        <FootprintOverlay
          screenX={footprintPoint.x}
          screenY={footprintPoint.y}
          bearing={displayLocation.bearing}
          moving={isMoving}
          width={layout.width}
          height={layout.height}
        />
      ) : null}
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
});
