import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { LocationCoords } from "@/hooks/useHostVisitorLocation";
import {
  MAP_CAMERA_PADDING,
  getRouteMapBounds,
  mapBoundsToLngLatBounds,
} from "@/lib/map/camera";
import {
  getFallbackMapStyleObject,
  getTourMapStyleObject,
} from "@/lib/map/style";
import type { DirectionsResponse, Host } from "@/types/host";

/** Bounded remounts after style-load failure; last attempt uses glyph-free fallback. */
const MAX_STYLE_RETRIES = 2;

interface HostMapViewProps {
  host: Host;
  visitorLocation: LocationCoords | null;
  directions: DirectionsResponse | null;
  isLoading?: boolean;
}

export function HostMapView({
  host,
  visitorLocation,
  directions,
  isLoading,
}: HostMapViewProps) {
  const theme = useTheme();
  const cameraRef = useRef<CameraRef>(null);
  const mapReadyRef = useRef(false);
  const styleRetryRef = useRef(0);
  const [styleAttempt, setStyleAttempt] = useState(0);

  const mapStyle = useMemo(
    () =>
      styleAttempt >= MAX_STYLE_RETRIES
        ? getFallbackMapStyleObject()
        : getTourMapStyleObject(),
    [styleAttempt],
  );

  const fitPoints = useMemo(() => {
    const points = [{ lat: host.latitude, lng: host.longitude }];
    if (visitorLocation) {
      points.push({
        lat: visitorLocation.latitude,
        lng: visitorLocation.longitude,
      });
    }
    return points;
  }, [host.latitude, host.longitude, visitorLocation]);

  const bounds = useMemo(() => getRouteMapBounds(fitPoints), [fitPoints]);

  const initialViewState = useMemo(() => {
    if (!bounds) {
      return {
        center: [host.longitude, host.latitude] as [number, number],
        zoom: 16,
      };
    }
    return {
      bounds: mapBoundsToLngLatBounds(bounds),
      padding: MAP_CAMERA_PADDING,
      zoom: 15,
    };
  }, [bounds, host.latitude, host.longitude]);

  const routeFeature = useMemo(() => {
    if (!directions?.polyline?.length) {
      return null;
    }
    return {
      type: "Feature" as const,
      properties: { id: "host-route" },
      geometry: {
        type: "LineString" as const,
        coordinates: directions.polyline.map((p) => [p.lng, p.lat]),
      },
    };
  }, [directions]);

  const visitorFeature = useMemo(() => {
    if (!visitorLocation) {
      return null;
    }
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Point" as const,
        coordinates: [visitorLocation.longitude, visitorLocation.latitude],
      },
    };
  }, [visitorLocation]);

  useEffect(() => {
    if (!mapReadyRef.current || !cameraRef.current || !bounds) {
      return;
    }
    cameraRef.current.fitBounds(mapBoundsToLngLatBounds(bounds), {
      padding: MAP_CAMERA_PADDING,
      duration: 800,
    });
  }, [bounds]);

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
        onDidFinishLoadingMap={() => {
          styleRetryRef.current = 0;
          mapReadyRef.current = true;
          if (bounds && cameraRef.current) {
            cameraRef.current.fitBounds(mapBoundsToLngLatBounds(bounds), {
              padding: MAP_CAMERA_PADDING,
              duration: 0,
            });
          }
        }}
        onDidFailLoadingMap={() => {
          if (styleRetryRef.current < MAX_STYLE_RETRIES) {
            styleRetryRef.current += 1;
            const attempt = styleRetryRef.current;
            setTimeout(() => setStyleAttempt((n) => n + 1), 300 * attempt);
          }
        }}
      >
        <Camera ref={cameraRef} initialViewState={initialViewState} />

        {routeFeature ? (
          <GeoJSONSource id="host-route" data={routeFeature}>
            <Layer
              id="host-route-line"
              type="line"
              style={{
                lineColor: theme.primary,
                lineWidth: 4,
                lineOpacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </GeoJSONSource>
        ) : null}

        <Marker
          id="host-pin"
          lngLat={[host.longitude, host.latitude]}
          anchor="bottom"
        >
          <View style={styles.hostPinOuter}>
            <View style={styles.hostPinHead}>
              <View style={styles.hostPinDot} />
            </View>
            <View style={styles.hostPinTail} />
          </View>
        </Marker>

        {visitorFeature ? (
          <GeoJSONSource id="visitor-position" data={visitorFeature}>
            <Layer
              id="visitor-halo"
              type="circle"
              style={{
                circleRadius: 14,
                circleColor: "rgba(59, 130, 246, 0.2)",
                circleStrokeColor: "rgba(59, 130, 246, 0.45)",
                circleStrokeWidth: 1,
              }}
            />
            <Layer
              id="visitor-dot"
              type="circle"
              style={{
                circleRadius: 7,
                circleColor: "#3b82f6",
                circleStrokeColor: "#ffffff",
                circleStrokeWidth: 2,
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>

      {isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  hostPinOuter: {
    alignItems: "center",
  },
  hostPinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    borderWidth: 3,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  hostPinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  hostPinTail: {
    marginTop: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#ef4444",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});
