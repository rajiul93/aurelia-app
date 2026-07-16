import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { translateString } from "@/i18n/strings";
import { useEntitlementsStore } from "@/store/entitlements-store";
import { useLocaleStore, type AppLanguage } from "@/store/locale-store";
import { useReleaseConfigStore } from "@/store/release-config-store";
import { useTourReminderStore } from "@/store/tour-reminder-store";
import {
  computePrepTriggers,
  computeScheduleKey,
  normalizePrepOffsets,
  normalizeReminderHour,
  REMINDER_MINUTE,
  resolveMode,
  type PrepOffset,
} from "./schedule-math";
import type { TourReminderEntry } from "./types";

const ANDROID_CHANNEL_ID = "tour-reminders";

/** `data.type` on a fired notification — the tap listener routes on this. */
export const REMINDER_NOTIFICATION_TYPES = {
  prep: "prep_reminder",
  nudge: "set_date_nudge",
} as const;

export type ReminderNotificationData = {
  type: (typeof REMINDER_NOTIFICATION_TYPES)[keyof typeof REMINDER_NOTIFICATION_TYPES];
  tourId: string;
};

// Deterministic identifiers so a reschedule cancels the exact prior entries
// instead of piling up duplicates.
const PREP_ID_PREFIX = "prep:";

function prepIdentifier(tourId: string, offsetDays: PrepOffset) {
  return `${PREP_ID_PREFIX}${tourId}:d${offsetDays}`;
}

function nudgeIdentifier(tourId: string) {
  return `nudge:${tourId}:daily`;
}

/**
 * The admin-controlled reminder cadence, read from the synced remote config.
 * Normalized here so every scheduling path sees clean values.
 */
function currentCadence() {
  const remote = useReleaseConfigStore.getState().config.remote;
  return {
    offsets: normalizePrepOffsets(remote.reminderOffsetDays),
    hour: normalizeReminderHour(remote.reminderHour),
    nudgeEnabled: remote.reminderNudgeEnabled !== false,
  };
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/** Fires the OS permission prompt (idempotent once already decided). */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Tour reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Cancel every Aurelia-owned reminder for one tour. Queries the OS scheduler
 * rather than assuming a fixed offset set, so changing the admin cadence (e.g.
 * [3,2,1] → [7,1]) still clears the stale prep identifiers it no longer emits.
 */
async function cancelTourNotifications(tourId: string) {
  const prepPrefix = `${PREP_ID_PREFIX}${tourId}:`;
  const nudgeId = nudgeIdentifier(tourId);

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled
      .map((item) => item.identifier)
      .filter(
        (id) => id === nudgeId || id.startsWith(prepPrefix),
      );

    await Promise.all(
      ours.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(
          () => undefined,
        ),
      ),
    );
  } catch {
    // If the query fails, fall back to cancelling the nudge (best effort).
    await Notifications.cancelScheduledNotificationAsync(nudgeId).catch(
      () => undefined,
    );
  }
}

function resolveTourTitle(tourId: string, locale: AppLanguage): string {
  const snapshot = useEntitlementsStore.getState().snapshot;
  const tour = snapshot?.entitlements.tours.find((entry) => entry.id === tourId);
  return tour?.title ?? translateString(locale, "reminder.genericTour");
}

/** Localized prep body: "tomorrow" for D-1, else a generic "in {days} days". */
function prepBody(
  locale: AppLanguage,
  offsetDays: PrepOffset,
  tour: string,
): string {
  if (offsetDays === 1) {
    return translateString(locale, "reminder.prep.body.d1", undefined, { tour });
  }

  if (offsetDays === 0) {
    return translateString(locale, "reminder.prep.body.today", undefined, {
      tour,
    });
  }

  return translateString(locale, "reminder.prep.body.generic", undefined, {
    tour,
    days: String(offsetDays),
  });
}

/**
 * Bring the OS schedule for one tour in line with its stored entry and the
 * admin cadence:
 * - dated → one prep reminder per admin offset day (past ones skipped)
 * - undated + skipped + nudge enabled → a daily nudge to set a date
 * - undated + not-yet-asked → nothing (the Set Tour Date modal handles it)
 *
 * A no-op when the fingerprint is unchanged, and a silent no-op when permission
 * hasn't been granted (leaves `scheduleKey` null so a later grant reschedules).
 */
export async function rescheduleTour(
  tourId: string,
  entry: TourReminderEntry,
  now: Date = new Date(),
): Promise<void> {
  const locale = useLocaleStore.getState().language;
  const cadence = currentCadence();
  const key = computeScheduleKey(entry, locale, now.getTimezoneOffset(), cadence);

  if (key === entry.scheduleKey) {
    return;
  }

  if (!(await hasNotificationPermission())) {
    return;
  }

  await ensureAndroidChannel();
  await cancelTourNotifications(tourId);

  const mode = resolveMode(entry);
  const title = resolveTourTitle(tourId, locale);

  if (mode === "dated") {
    const triggers = computePrepTriggers(
      entry.tourDate,
      now,
      cadence.offsets,
      cadence.hour,
    );
    for (const trigger of triggers) {
      await Notifications.scheduleNotificationAsync({
        identifier: prepIdentifier(tourId, trigger.offsetDays),
        content: {
          title: translateString(locale, "reminder.prep.title", undefined, {
            tour: title,
          }),
          body: prepBody(locale, trigger.offsetDays, title),
          data: {
            type: REMINDER_NOTIFICATION_TYPES.prep,
            tourId,
          } satisfies ReminderNotificationData,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger.date,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  } else if (entry.promptSkipped && cadence.nudgeEnabled) {
    await Notifications.scheduleNotificationAsync({
      identifier: nudgeIdentifier(tourId),
      content: {
        title: translateString(locale, "reminder.nudge.title", undefined, {
          tour: title,
        }),
        body: translateString(locale, "reminder.nudge.body", undefined, {
          tour: title,
        }),
        data: {
          type: REMINDER_NOTIFICATION_TYPES.nudge,
          tourId,
        } satisfies ReminderNotificationData,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: cadence.hour,
        minute: REMINDER_MINUTE,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }

  await useTourReminderStore.getState().setScheduleKey(tourId, key);
}

/**
 * Re-sync every tracked tour with the OS scheduler. Called on cold start (after
 * hydrate) so timezone/clock drift and admin cadence changes self-heal, and
 * after any bulk change.
 */
export async function rescheduleAllReminders(now: Date = new Date()): Promise<void> {
  const { byTourId } = useTourReminderStore.getState();

  for (const [tourId, entry] of Object.entries(byTourId)) {
    await rescheduleTour(tourId, entry, now);
  }
}

/** Wipe every scheduled reminder — used on sign-out. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
