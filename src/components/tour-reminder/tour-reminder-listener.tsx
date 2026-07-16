import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

import {
  REMINDER_NOTIFICATION_TYPES,
  type ReminderNotificationData,
} from "@/lib/tour-reminder/scheduler";

function isReminderData(value: unknown): value is ReminderNotificationData {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  return (
    (data.type === REMINDER_NOTIFICATION_TYPES.prep ||
      data.type === REMINDER_NOTIFICATION_TYPES.nudge) &&
    typeof data.tourId === "string"
  );
}

function handleReminderTap(data: ReminderNotificationData) {
  if (data.type === REMINDER_NOTIFICATION_TYPES.prep) {
    router.push(`/tour/${data.tourId}/visit-checklist`);
  } else {
    // set_date_nudge → send the buyer to Settings' visit-dates list.
    router.push("/settings");
  }
}

/**
 * Routes a tapped reminder to the right screen. Uses the imperative listener for
 * taps while the app is running, plus `useLastNotificationResponse` to catch the
 * tap that cold-launched the app. A processed-id ref stops the same launch tap
 * from double-firing when both paths see it.
 */
export function TourReminderListener() {
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Foreground behavior: still surface the reminder as a banner while the app
    // is open (silent — the buyer is already looking at their phone). Set here
    // rather than at module scope so importing this file can never run native
    // code at load time.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, []);

  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const id = response.notification.request.identifier;
        if (handledIdRef.current === id) {
          return;
        }
        handledIdRef.current = id;

        const data = response.notification.request.content.data;
        if (isReminderData(data)) {
          handleReminderTap(data);
        }
      });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!lastResponse) {
      return;
    }

    const id = lastResponse.notification.request.identifier;
    if (handledIdRef.current === id) {
      return;
    }
    handledIdRef.current = id;

    const data = lastResponse.notification.request.content.data;
    if (isReminderData(data)) {
      handleReminderTap(data);
    }
  }, [lastResponse]);

  return null;
}
