import { useEffect, useState } from "react";

import { isHostAvailableNow } from "@/lib/host/availability";
import { useRemoteConfig } from "@/store/release-config-store";
import type { Host } from "@/types/host";

/** Re-evaluate on a coarse tick so a chip flips when a shift starts or ends. */
const TICK_MS = 60_000;

/**
 * Live availability for a host, derived on device from the venue's clock.
 * Replaces the old 30s network poll: the inputs (opening hours + venue zone)
 * change rarely, only *now* moves, so a local timer is enough and works offline.
 */
export function useHostAvailability(host: Host): boolean {
  const { venueTimezone } = useRemoteConfig();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return isHostAvailableNow(host, venueTimezone, now);
}
