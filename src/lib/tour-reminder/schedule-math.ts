import type { TourReminderEntry, TourReminderMode } from "./types";

/** Fallback prep-reminder time when the admin config has none. */
export const DEFAULT_REMINDER_HOUR = 9;
export const REMINDER_MINUTE = 0;

/** Fallback days before the visit each prep reminder fires: D-3, D-2, D-1. */
export const DEFAULT_PREP_OFFSET_DAYS = [3, 2, 1] as const;

/** A single prep reminder is any whole number of days before the visit. */
export type PrepOffset = number;

export type PrepTrigger = {
  /** How many days before the visit this reminder fires. */
  offsetDays: PrepOffset;
  /** The exact local instant (reminderHour that calendar day) it should fire. */
  date: Date;
};

/**
 * Clean an admin-supplied offset list into whole days in [0, 60], deduped and
 * sorted largest-first (so D-3 fires before D-1). `undefined` (config not yet
 * synced) falls back to the default cadence; an explicit empty array is honoured
 * as "no prep reminders".
 */
export function normalizePrepOffsets(
  offsets: readonly number[] | undefined,
): number[] {
  if (offsets === undefined) {
    return [...DEFAULT_PREP_OFFSET_DAYS];
  }

  return Array.from(
    new Set(
      offsets
        .map((value) => Math.trunc(value))
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 60),
    ),
  ).sort((a, b) => b - a);
}

/** Clamp an admin-supplied hour to a valid 0–23, falling back to the default. */
export function normalizeReminderHour(hour: number | undefined): number {
  if (hour === undefined || !Number.isFinite(hour)) {
    return DEFAULT_REMINDER_HOUR;
  }

  const truncated = Math.trunc(hour);
  if (truncated < 0 || truncated > 23) {
    return DEFAULT_REMINDER_HOUR;
  }

  return truncated;
}

/**
 * Parse a "YYYY-MM-DD" calendar day into a local `Date` at midnight. Returns
 * null for missing/malformed input. Building it from numeric components (rather
 * than `new Date(str)`) keeps it in the *device's* zone — `new Date("2026-07-14")`
 * would parse as UTC midnight and shift the day for anyone west of UTC.
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // Reject impossible dates that JS would silently roll over (e.g. 2026-02-30).
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

/**
 * The prep-reminder instants for a visit day, with any that already lie in the
 * past dropped. `offsets` and `hour` come from admin config (already normalized
 * by the caller, but re-normalized here for safety). Returns an empty array when
 * the date is unset/invalid, there are no offsets, or all reminders have passed.
 */
export function computePrepTriggers(
  tourDate: string | null | undefined,
  now: Date,
  offsets: readonly number[] = DEFAULT_PREP_OFFSET_DAYS,
  hour: number = DEFAULT_REMINDER_HOUR,
): PrepTrigger[] {
  const base = parseLocalDate(tourDate);
  if (!base) {
    return [];
  }

  const cleanOffsets = normalizePrepOffsets(offsets);
  const cleanHour = normalizeReminderHour(hour);

  return cleanOffsets
    .map((offsetDays) => {
      const date = new Date(base);
      date.setDate(date.getDate() - offsetDays);
      date.setHours(cleanHour, REMINDER_MINUTE, 0, 0);
      return { offsetDays, date };
    })
    .filter((trigger) => trigger.date.getTime() > now.getTime());
}

/**
 * Which mode an entry is in: "dated" once a visit day is set, "undated"
 * otherwise (a daily nudge until the buyer picks a date).
 */
export function resolveMode(entry: {
  tourDate: string | null;
}): TourReminderMode {
  return entry.tourDate ? "dated" : "undated";
}

/**
 * A stable fingerprint of everything that affects the scheduled notifications:
 * mode, date, start time, whether the buyer skipped (which turns the daily nudge
 * on), the copy locale, the device's UTC offset, and the admin cadence (offsets
 * + hour + nudge flag). Two syncs with the same key mean the OS already holds
 * the right schedule, so we skip re-scheduling. The offset is in the key so that
 * a timezone change invalidates the absolute prep-reminder instants and a
 * cold-start resync re-computes them (self-healing); the cadence is in the key
 * so an admin change reschedules on the next sync.
 */
export function computeScheduleKey(
  entry: Pick<TourReminderEntry, "tourDate" | "startTime" | "promptSkipped">,
  locale: string,
  timezoneOffsetMinutes: number,
  cadence?: {
    offsets: readonly number[];
    hour: number;
    nudgeEnabled: boolean;
  },
): string {
  const mode = resolveMode(entry);
  const skip = entry.promptSkipped ? "skip" : "ask";
  const offsets = normalizePrepOffsets(cadence?.offsets).join(",");
  const hour = normalizeReminderHour(cadence?.hour);
  const nudge = cadence?.nudgeEnabled === false ? "nudgeOff" : "nudgeOn";
  return [
    mode,
    entry.tourDate ?? "-",
    entry.startTime ?? "-",
    skip,
    locale,
    String(timezoneOffsetMinutes),
    offsets,
    String(hour),
    nudge,
  ].join("|");
}
