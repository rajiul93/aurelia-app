import * as Speech from "expo-speech";

import { OFF_ROUTE_VOICE_COOLDOWN_MS } from "@/lib/navigation/types";

let lastSpokenAt = 0;

export function speakOffRouteWarning(message: string, language: string) {
  const now = Date.now();

  if (now - lastSpokenAt < OFF_ROUTE_VOICE_COOLDOWN_MS) {
    return false;
  }

  lastSpokenAt = now;
  Speech.stop();
  Speech.speak(message, {
    language,
    rate: 0.95,
  });

  return true;
}

export function stopOffRouteWarning() {
  Speech.stop();
}

export function resetOffRouteVoiceCooldown() {
  lastSpokenAt = 0;
}
