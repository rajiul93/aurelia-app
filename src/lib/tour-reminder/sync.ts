import { useTourReminderStore } from "@/store/tour-reminder-store";
import type { Entitlements } from "@/types/auth";
import { rescheduleAllReminders, rescheduleTour } from "./scheduler";
import { emptyReminderEntry } from "./types";

type EntitlementTour = Entitlements["tours"][number];

/**
 * Reconcile local reminder state with the server's admin-set visit dates, then
 * reschedule. Precedence: the buyer's own date (`userOverridden`) always wins —
 * the admin value only seeds a tour the buyer hasn't touched. A tour with no
 * admin date and no local entry gets an empty (undated) entry so the Set Tour
 * Date modal can find it.
 *
 * Never throws into the entitlements path: a scheduling failure must not break
 * offline access.
 */
export async function syncRemindersFromEntitlements(
  tours: EntitlementTour[],
): Promise<void> {
  const store = useTourReminderStore.getState();

  for (const tour of tours) {
    const existing = store.byTourId[tour.id];

    if (existing?.userOverridden) {
      continue;
    }

    if (tour.tourDate) {
      await store.upsertEntry(tour.id, {
        tourDate: tour.tourDate,
        startTime: tour.startTime,
        source: "admin",
      });
    } else if (!existing) {
      await store.upsertEntry(tour.id, emptyReminderEntry());
    }
  }

  await rescheduleAllReminders();
}

/** The buyer picked (or changed) a visit date — their choice from now on. */
export async function setUserVisitDate(
  tourId: string,
  tourDate: string,
  startTime: string | null,
): Promise<void> {
  const entry = await useTourReminderStore.getState().upsertEntry(tourId, {
    tourDate,
    startTime,
    source: "user",
    userOverridden: true,
    promptSkipped: false,
  });
  await rescheduleTour(tourId, entry);
}

/** "I'll do it later" — suppress the modal and start the daily set-date nudge. */
export async function skipReminderPrompt(tourId: string): Promise<void> {
  const entry = await useTourReminderStore.getState().upsertEntry(tourId, {
    promptSkipped: true,
  });
  await rescheduleTour(tourId, entry);
}

/** Settings "clear": drop the date but keep it the buyer's call (no re-seed, no nudge). */
export async function clearUserVisitDate(tourId: string): Promise<void> {
  const entry = await useTourReminderStore.getState().upsertEntry(tourId, {
    tourDate: null,
    startTime: null,
    source: "user",
    userOverridden: true,
    promptSkipped: false,
  });
  await rescheduleTour(tourId, entry);
}
