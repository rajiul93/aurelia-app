import * as Speech from "expo-speech";

let lastAnnouncedSpotId: string | null = null;

/**
 * Speak a one-shot arrival announcement for a spot. De-dupes per spot so the
 * same arrival isn't announced twice; a different spot resets the guard. Uses
 * on-device TTS, so it works fully offline.
 */
export function speakArrival(
  spotId: string,
  message: string,
  language: string,
): boolean {
  if (spotId === lastAnnouncedSpotId) {
    return false;
  }

  lastAnnouncedSpotId = spotId;
  Speech.stop();
  Speech.speak(message, {
    language,
    rate: 0.95,
  });

  return true;
}

export function resetArrivalVoice() {
  lastAnnouncedSpotId = null;
}
