import { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import MapLibre, { Camera, MarkerView, ShapeSource, LineLayer } from "@maplibre/maplibre-react-native";
import { useTheme } from "@/hooks/use-theme";
import type { Host } from "@/types/host";
import type { LocationCoords } from "@/hooks/useHostVisitorLocation";
import type { DirectionsResponse } from "@/types/host";

MapLibre.setAccessToken("pk.test");

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
  const cameraRef = useRef<Camera>(null);

  // Center map between host and visitor, or just on host if no visitor location
  useEffect(() => {
    if (!cameraRef.current) return;

    if (visitorLocation && host) {
      const centerLat = (visitorLocation.latitude + host.latitude) / 2;
      const centerLng = (visitorLocation.longitude + host.longitude) / 2;

      cameraRef.current.setCamera({
        centerCoordinate: [centerLng, centerLat],
        zoomLevel: 16,
        animationDuration: 1000,
      });
    } else if (host) {
      cameraRef.current.setCamera({
        centerCoordinate: [host.longitude, host.latitude],
        zoomLevel: 16,
        animationDuration: 1000,
      });
    }
  }, [host, visitorLocation]);

  const routeFeature = directions
    ? {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: directions.polyline.map((p) => [p.lng, p.lat]),
        },
      }
    : null;

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <MapLibre.MapView
        style={{ flex: 1 }}
        styleURL="https://demotiles.maplibre.org/style.json"
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [host.longitude, host.latitude],
            zoomLevel: 16,
          }}
        />

        {/* Route polyline */}
        {routeFeature && (
          <ShapeSource id="route-source" shape={routeFeature}>
            <LineLayer
              id="route-line"
              style={{
                lineColor: theme.primary,
                lineWidth: 4,
                lineOpacity: 0.8,
              }}
            />
          </ShapeSource>
        )}

        {/* Host pin */}
        <MarkerView coordinate={[host.longitude, host.latitude]}>
          <View
            style={{
              width: 40,
              height: 50,
              backgroundColor: "#ef4444",
              borderRadius: 20,
              borderWidth: 3,
              borderColor: "white",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                backgroundColor: "white",
                borderRadius: 6,
              }}
            />
          </View>
        </MarkerView>

        {/* Visitor location dot */}
        {visitorLocation && (
          <MarkerView
            coordinate={[visitorLocation.longitude, visitorLocation.latitude]}
          >
            <View
              style={{
                width: 24,
                height: 24,
                backgroundColor: "#3b82f6",
                borderRadius: 12,
                borderWidth: 3,
                borderColor: "white",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 5,
              }}
            />
          </MarkerView>
        )}
      </MapLibre.MapView>

      {isLoading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    </View>
  );
}
