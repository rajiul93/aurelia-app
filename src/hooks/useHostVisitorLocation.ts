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
          timeInterval: 1000,
          // No distance gate: at 5 m a stationary visitor received no updates
          // at all. Same fix as the tour navigation watch.
          distanceInterval: 0,
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
    let cancelled = false;

    async function bootstrap() {
      // Yield before touching state. requestPermission sets "requesting" before
      // its first await, so calling it straight from an effect body writes state
      // synchronously during commit and cascades an extra render. It stays
      // synchronous for event-handler callers, where that is exactly right.
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      if (autoRequest) {
        await requestPermission();
        return;
      }

      try {
        const { status: permissionStatus } =
          await Location.getForegroundPermissionsAsync();

        if (cancelled) {
          return;
        }

        if (permissionStatus === "granted") {
          await requestPermission();
        } else if (permissionStatus === "denied") {
          setStatus("denied");
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
    };
  }, [autoRequest, requestPermission]);

  return { status, position, requestPermission, initializing };
}
