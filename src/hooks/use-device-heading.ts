import * as Location from "expo-location";
import { useEffect, useState } from "react";

/**
 * Subscribes to the device's physical compass heading (0–359°, clockwise from
 * north) via the magnetometer. Prefers true (geographic) north, falling back to
 * magnetic north when a true bearing isn't available. Works fully offline.
 *
 * Returns `null` until the first reading (or if the sensor is unavailable), so
 * callers can hide the compass until a real heading exists.
 */
export function useDeviceHeading(enabled = true): number | null {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    async function subscribe() {
      try {
        subscription = await Location.watchHeadingAsync((reading) => {
          if (cancelled) {
            return;
          }

          const value =
            reading.trueHeading >= 0 ? reading.trueHeading : reading.magHeading;

          if (Number.isFinite(value) && value >= 0) {
            setHeading(value);
          }
        });
      } catch {
        // Sensor unavailable (e.g. emulator without a magnetometer) — leave null.
      }
    }

    void subscribe();

    return () => {
      cancelled = true;
      subscription?.remove();
      subscription = null;
    };
  }, [enabled]);

  return heading;
}
