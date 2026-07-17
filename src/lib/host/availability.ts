import type { Host } from "@/types/host";

/**
 * Client mirror of the server's host-availability window.
 *
 * The server sends `isAvailableNow`, but it is a snapshot from response time —
 * it goes stale the moment it lands, and the app no longer polls to refresh it.
 * Deriving it on device instead keeps the chip live between fetches and costs
 * no requests.
 *
 * The window must be read on the *venue's* clock: `availableFrom`/`availableTo`
 * are bare "HH:mm" with no zone, and a visitor's phone carries whatever zone
 * they travelled from. The zone comes from remote config.
 */

/**
 * Hermes does not guarantee `Intl.DateTimeFormat` timeZone support across every
 * build/platform. Probe once rather than assume: if it's missing, we fall back
 * to the server's value instead of silently reading the device clock, which
 * would resurrect the exact bug this code exists to fix.
 */
let timezoneSupport: boolean | null = null;

export function supportsTimezoneFormatting(): boolean {
  if (timezoneSupport !== null) {
    return timezoneSupport;
  }

  try {
    const probe = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date("2026-07-17T08:30:00Z"));

    // Rome is UTC+2 that day. If the zone were ignored we'd get 08:30 back.
    timezoneSupport = probe.includes("10:30");
  } catch {
    timezoneSupport = false;
  }

  return timezoneSupport;
}

/** The venue's current wall clock as "HH:mm", or null if the runtime can't. */
export function venueWallClock(now: Date, timezone: string): string | null {
  if (!supportsTimezoneFormatting()) {
    return null;
  }

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const hour = parts.find((part) => part.type === "hour")?.value;
    const minute = parts.find((part) => part.type === "minute")?.value;

    return hour && minute ? `${hour}:${minute}` : null;
  } catch {
    // An invalid zone from config shouldn't take the host list down.
    return null;
  }
}

export function isWithinWindow(
  availableFrom: string,
  availableTo: string,
  wallClock: string,
): boolean {
  if (availableFrom <= availableTo) {
    return wallClock >= availableFrom && wallClock < availableTo;
  }

  // Window wraps past midnight (e.g. 22:00–02:00).
  return wallClock >= availableFrom || wallClock < availableTo;
}

export function isHostAvailableNow(
  host: Pick<Host, "isActive" | "availableFrom" | "availableTo" | "isAvailableNow">,
  venueTimezone: string,
  now = new Date(),
): boolean {
  if (!host.isActive) {
    return false;
  }

  if (!host.availableFrom || !host.availableTo) {
    return true;
  }

  const wallClock = venueWallClock(now, venueTimezone);

  if (wallClock === null) {
    return host.isAvailableNow;
  }

  return isWithinWindow(host.availableFrom, host.availableTo, wallClock);
}
