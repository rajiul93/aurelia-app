/**
 * Local, per-tour reminder state. This is the device's source of truth for the
 * prep-reminder schedule: the admin can seed a `tourDate` from the server, but
 * once the buyer edits it themselves (`userOverridden`) their value wins and the
 * server never overwrites it. Reminder v1 keeps all of this on-device — there is
 * no write-back endpoint.
 */

/** "dated" once a visit day is known; "undated" until then (daily nudge). */
export type TourReminderMode = "dated" | "undated";

/** Where the current `tourDate` came from — an admin grant or the buyer. */
export type TourReminderSource = "admin" | "user";

export type TourReminderEntry = {
  /** Planned visit day "YYYY-MM-DD", or null when not scheduled yet. */
  tourDate: string | null;
  /** Optional "HH:mm" start time, used only in reminder copy. */
  startTime: string | null;
  source: TourReminderSource;
  /** True once the buyer edited the date; blocks admin re-seeding from clobbering it. */
  userOverridden: boolean;
  /** True after "I'll do it later" on the Set Tour Date modal — suppresses re-prompting. */
  promptSkipped: boolean;
  /** Visit-checklist toggle state, keyed by checklist item id. */
  checklist: Record<string, boolean>;
  /**
   * Fingerprint of the last schedule we committed to the OS (mode + date +
   * start time + locale). If it hasn't changed, rescheduling is a no-op, so a
   * cold-start resync doesn't churn the OS scheduler.
   */
  scheduleKey: string | null;
};

/** The whole store, keyed by tourId. */
export type TourReminderMap = Record<string, TourReminderEntry>;

export type TourReminderSnapshot = {
  byTourId: TourReminderMap;
};

/** A fresh entry with sensible defaults; callers override the fields they set. */
export function emptyReminderEntry(): TourReminderEntry {
  return {
    tourDate: null,
    startTime: null,
    source: "admin",
    userOverridden: false,
    promptSkipped: false,
    checklist: {},
    scheduleKey: null,
  };
}
