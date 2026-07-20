import * as Speech from "expo-speech";

let lastAnnouncedSpotId: string | null = null;

/**
 * Speak a one-shot "head for the next stop" cue. De-dupes per spot so walking
 * around inside the approach radius doesn't repeat it; a different spot resets
 * the guard. On-device TTS, so it works fully offline — the stop's title comes
 * from the installed bundle, never the network.
 *
 * Mirrors arrival-voice deliberately: the two are the same kind of cue at
 * different distances, and keeping them symmetrical makes it obvious that
 * approach must fire first (see the invariant on DEFAULT_NAVIGATION_THRESHOLDS).
 */
export function speakApproach(
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

export function resetApproachVoice() {
  lastAnnouncedSpotId = null;
}
