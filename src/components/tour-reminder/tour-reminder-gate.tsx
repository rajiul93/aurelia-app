import { useState } from "react";

import { SetTourDateModal } from "@/components/tour-reminder/set-tour-date-modal";
import { setUserVisitDate, skipReminderPrompt } from "@/lib/tour-reminder/sync";
import { useAuthStore } from "@/store/auth-store";
import { useEntitlementsStore } from "@/store/entitlements-store";
import { useTourReminderStore } from "@/store/tour-reminder-store";

/**
 * Watches for an entitled tour that has no visit date yet and prompts the buyer
 * to set one (the JIT-permission Set Tour Date modal). Shows at most **one**
 * modal per app session — the first eligible tour — and once the buyer acts on
 * it, the rest are left to the Settings list, so we never nag.
 *
 * Mounted once near the root. Renders nothing when there's no session, nothing
 * to prompt, or the buyer has already been prompted this session.
 */
export function TourReminderGate() {
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const snapshot = useEntitlementsStore((state) => state.snapshot);
  const reminderHydrated = useTourReminderStore((state) => state.hydrated);
  const byTourId = useTourReminderStore((state) => state.byTourId);

  const [handledThisSession, setHandledThisSession] = useState(false);

  const tours = snapshot?.entitlements.tours ?? [];

  // First entitled tour the buyer hasn't scheduled, skipped, or overridden.
  const pending = tours.find((tour) => {
    const entry = byTourId[tour.id];
    if (!entry) {
      // No entry yet: an admin date would have created a dated entry, so absence
      // means undated — still eligible once sync has run.
      return false;
    }
    return !entry.tourDate && !entry.promptSkipped && !entry.userOverridden;
  });

  const shouldShow =
    Boolean(sessionToken) &&
    reminderHydrated &&
    !handledThisSession &&
    Boolean(pending);

  if (!shouldShow || !pending) {
    return null;
  }

  function handleConfirm(tourId: string, date: string, time: string | null) {
    setHandledThisSession(true);
    void setUserVisitDate(tourId, date, time);
  }

  function handleSkip(tourId: string) {
    setHandledThisSession(true);
    void skipReminderPrompt(tourId);
  }

  return (
    <SetTourDateModal
      visible
      tourTitle={pending.title}
      onConfirm={(date, time) => handleConfirm(pending.id, date, time)}
      onSkip={() => handleSkip(pending.id)}
      onClose={() => setHandledThisSession(true)}
    />
  );
}
