import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export type LocationStatus = "idle" | "requesting" | "ready" | "denied" | "error" | "timeout";

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface UseHostVisitorLocationOptions {
  autoRequest?: boolean;
}

export function useHostVisitorLocation(options?: UseHostVisitorLocationOptions) {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [position, setPosition] = useState<LocationCoords | null>(null);
  const [initializing, setInitializing] = useState(!options?.autoRequest);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const { autoRequest = false } = options ?? {};

  const requestPermission = useCallback(async () => {
    setStatus("requesting");
    try {
      const { status: permissionStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (permissionStatus !== "granted") {
        setStatus("denied");
        return;
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Location timeout")), 10000)
      );

      try {
        const initialLocation = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          timeoutPromise as Promise<any>,
        ]);

        setPosition({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        });
      } catch (timeoutError) {
        if ((timeoutError as Error).message === "Location timeout") {
          setStatus("timeout");
          return;
        }
        throw timeoutError;
      }

      setStatus("ready");

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2000,
          distanceInterval: 5,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("unavailable") || errorMessage.includes("disabled")) {
        setStatus("error");
      } else {
        setStatus("denied");
      }
    }
  }, []);

  useEffect(() => {
    if (autoRequest) {
      requestPermission();
    } else {
      const checkPermissionStatus = async () => {
        try {
          const { status: permissionStatus } =
            await Location.getForegroundPermissionsAsync();
          if (permissionStatus === "granted") {
            await requestPermission();
          } else if (permissionStatus === "denied") {
            setStatus("denied");
          }
        } finally {
          setInitializing(false);
        }
      };
      checkPermissionStatus();
    }

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [autoRequest, requestPermission]);

  return { status, position, requestPermission, initializing };
}
