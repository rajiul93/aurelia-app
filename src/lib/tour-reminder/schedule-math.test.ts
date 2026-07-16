import { describe, expect, it } from "vitest";

import {
  computePrepTriggers,
  computeScheduleKey,
  DEFAULT_REMINDER_HOUR,
  normalizePrepOffsets,
  normalizeReminderHour,
  parseLocalDate,
  resolveMode,
} from "./schedule-math";
import { emptyReminderEntry } from "./types";

describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD to local midnight of that day", () => {
    const date = parseLocalDate("2026-07-14")!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6); // July, 0-indexed
    expect(date.getDate()).toBe(14);
    expect(date.getHours()).toBe(0);
  });

  it("returns null for empty or malformed input", () => {
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate("")).toBeNull();
    expect(parseLocalDate("2026/07/14")).toBeNull();
    expect(parseLocalDate("14-07-2026")).toBeNull();
  });

  it("rejects impossible dates instead of rolling them over", () => {
    expect(parseLocalDate("2026-02-30")).toBeNull();
    expect(parseLocalDate("2026-13-01")).toBeNull();
  });
});

describe("computePrepTriggers", () => {
  it("schedules D-3/D-2/D-1 at 09:00 local when all are in the future", () => {
    const now = new Date(2026, 6, 1, 8, 0, 0); // 2026-07-01 08:00
    const triggers = computePrepTriggers("2026-07-14", now);

    expect(triggers.map((t) => t.offsetDays)).toEqual([3, 2, 1]);
    expect(triggers.map((t) => t.date.getDate())).toEqual([11, 12, 13]);
    for (const trigger of triggers) {
      expect(trigger.date.getHours()).toBe(DEFAULT_REMINDER_HOUR);
      expect(trigger.date.getMinutes()).toBe(0);
    }
  });

  it("drops reminders whose 09:00 instant has already passed", () => {
    // "Now" is 2026-07-12 10:00 — D-3 (the 11th) and D-2 09:00 (the 12th) are
    // past; only D-1 (the 13th) remains.
    const now = new Date(2026, 6, 12, 10, 0, 0);
    const triggers = computePrepTriggers("2026-07-14", now);

    expect(triggers.map((t) => t.offsetDays)).toEqual([1]);
    expect(triggers[0].date.getDate()).toBe(13);
  });

  it("returns nothing once every prep reminder has passed", () => {
    const now = new Date(2026, 6, 14, 12, 0, 0); // visit day itself, afternoon
    expect(computePrepTriggers("2026-07-14", now)).toEqual([]);
  });

  it("returns nothing for an unset or invalid date", () => {
    const now = new Date(2026, 6, 1);
    expect(computePrepTriggers(null, now)).toEqual([]);
    expect(computePrepTriggers("nope", now)).toEqual([]);
  });

  it("honours an admin-set offset list and hour", () => {
    const now = new Date(2026, 6, 1, 8, 0, 0);
    const triggers = computePrepTriggers("2026-07-14", now, [7, 3, 1], 18);

    expect(triggers.map((t) => t.offsetDays)).toEqual([7, 3, 1]);
    expect(triggers.map((t) => t.date.getDate())).toEqual([7, 11, 13]);
    for (const trigger of triggers) {
      expect(trigger.date.getHours()).toBe(18);
    }
  });

  it("returns nothing when the admin disables prep reminders (empty offsets)", () => {
    const now = new Date(2026, 6, 1, 8, 0, 0);
    expect(computePrepTriggers("2026-07-14", now, [], 9)).toEqual([]);
  });
});

describe("normalizePrepOffsets", () => {
  it("dedupes, drops out-of-range, and sorts largest-first", () => {
    expect(normalizePrepOffsets([1, 3, 3, 2, -1, 99, 7])).toEqual([7, 3, 2, 1]);
  });

  it("falls back to the default cadence when undefined", () => {
    expect(normalizePrepOffsets(undefined)).toEqual([3, 2, 1]);
  });

  it("honours an explicit empty array as 'no reminders'", () => {
    expect(normalizePrepOffsets([])).toEqual([]);
  });
});

describe("normalizeReminderHour", () => {
  it("clamps invalid hours back to the default", () => {
    expect(normalizeReminderHour(24)).toBe(DEFAULT_REMINDER_HOUR);
    expect(normalizeReminderHour(-1)).toBe(DEFAULT_REMINDER_HOUR);
    expect(normalizeReminderHour(undefined)).toBe(DEFAULT_REMINDER_HOUR);
  });

  it("passes a valid hour through", () => {
    expect(normalizeReminderHour(0)).toBe(0);
    expect(normalizeReminderHour(18)).toBe(18);
  });
});

describe("resolveMode", () => {
  it("is dated once a visit date is set, undated otherwise", () => {
    expect(resolveMode({ tourDate: "2026-07-14" })).toBe("dated");
    expect(resolveMode({ tourDate: null })).toBe("undated");
  });
});

describe("computeScheduleKey", () => {
  const locale = "en";
  const offset = -360; // arbitrary fixed offset (minutes)

  it("is stable for identical inputs (so a resync is a no-op)", () => {
    const entry = { tourDate: "2026-07-14", startTime: "09:00", promptSkipped: false };
    expect(computeScheduleKey(entry, locale, offset)).toBe(
      computeScheduleKey(entry, locale, offset),
    );
  });

  it("changes when the date, time, skip flag, locale, or timezone changes", () => {
    const base = { tourDate: "2026-07-14", startTime: "09:00", promptSkipped: false };
    const key = computeScheduleKey(base, locale, offset);

    expect(computeScheduleKey({ ...base, tourDate: "2026-07-15" }, locale, offset)).not.toBe(key);
    expect(computeScheduleKey({ ...base, startTime: "10:00" }, locale, offset)).not.toBe(key);
    expect(computeScheduleKey({ ...base, promptSkipped: true }, locale, offset)).not.toBe(key);
    expect(computeScheduleKey(base, "fr", offset)).not.toBe(key);
    expect(computeScheduleKey(base, locale, offset + 60)).not.toBe(key);
  });

  it("distinguishes dated from undated (mode is part of the key)", () => {
    const dated = { tourDate: "2026-07-14", startTime: null, promptSkipped: false };
    const undated = { tourDate: null, startTime: null, promptSkipped: false };
    expect(computeScheduleKey(dated, locale, offset)).not.toBe(
      computeScheduleKey(undated, locale, offset),
    );
  });

  it("keys an undated skipped entry differently from an undated un-asked one", () => {
    // The transition that turns the daily nudge on must invalidate the schedule.
    const asked = { ...emptyReminderEntry(), promptSkipped: false };
    const skipped = { ...emptyReminderEntry(), promptSkipped: true };
    expect(computeScheduleKey(asked, locale, offset)).not.toBe(
      computeScheduleKey(skipped, locale, offset),
    );
  });

  it("changes when the admin cadence (offsets, hour, or nudge) changes", () => {
    const entry = {
      tourDate: "2026-07-14",
      startTime: null,
      promptSkipped: false,
    };
    const base = computeScheduleKey(entry, locale, offset, {
      offsets: [3, 2, 1],
      hour: 9,
      nudgeEnabled: true,
    });

    expect(
      computeScheduleKey(entry, locale, offset, {
        offsets: [7, 1],
        hour: 9,
        nudgeEnabled: true,
      }),
    ).not.toBe(base);
    expect(
      computeScheduleKey(entry, locale, offset, {
        offsets: [3, 2, 1],
        hour: 18,
        nudgeEnabled: true,
      }),
    ).not.toBe(base);
    expect(
      computeScheduleKey(entry, locale, offset, {
        offsets: [3, 2, 1],
        hour: 9,
        nudgeEnabled: false,
      }),
    ).not.toBe(base);
  });
});
