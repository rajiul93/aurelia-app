import { useEffect, useState } from "react";
import * as Location from "expo-location";

export type LocationStatus = "pending" | "ready" | "denied";

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export function useHostVisitorLocation() {
  const [status, setStatus] = useState<LocationStatus>("pending");
  const [position, setPosition] = useState<LocationCoords | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      try {
        const { status: permissionStatus } =
          await Location.requestForegroundPermissionsAsync();

        if (permissionStatus !== "granted") {
          setStatus("denied");
          return;
        }

        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setPosition({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        });

        setStatus("ready");

        // Watch for updates every 2 seconds
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,
            distanceInterval: 5, // Update if moved >5m
          },
          (location) => {
            setPosition({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        );
      } catch (error) {
        console.error("Location error:", error);
        setStatus("denied");
      }
    };

    startTracking();

    return () => {
      subscription?.remove();
    };
  }, []);

  return { status, position };
}
