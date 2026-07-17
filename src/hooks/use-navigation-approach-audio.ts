import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef, useState } from "react";

import { resolveInstalledMediaUri } from "@/lib/bundle/media-cache";
import { getSpotMediaByType } from "@/lib/bundle/spot-media";
import { useInstalledMediaMap } from "@/hooks/queries/use-installed-media-map";
import { useRemoteConfig } from "@/store/release-config-store";
import type { BundleSpot } from "@/types/bundle-content";

export function useNavigationApproachAudio(
  tourId: string,
  spot: BundleSpot | null,
  shouldPlay: boolean,
) {
  const remote = useRemoteConfig();
  const { data: mediaMap } = useInstalledMediaMap(tourId);
  const playedSpotIdRef = useRef<string | null>(null);
  const [resolved, setResolved] = useState<{
    spotId: string;
    uri: string | null;
  } | null>(null);

  // Derived, not stored: a resolution is tagged with the spot it was resolved
  // for, so walking past two stops quickly can't let a late-arriving URI for the
  // previous stop narrate the current one. This also means no effect has to
  // clear the URL when `spot` changes — it stops matching by itself.
  const playbackUrl =
    resolved && spot && resolved.spotId === spot.id ? resolved.uri : null;

  const player = useAudioPlayer(playbackUrl ?? "", {
    downloadFirst: true,
  });

  // Returning to a stop should announce it again.
  useEffect(() => {
    playedSpotIdRef.current = null;
  }, [spot?.id]);

  useEffect(() => {
    const audioItem = spot ? getSpotMediaByType(spot, "AUDIO")[0] : null;

    if (!spot || !audioItem || !mediaMap) {
      return;
    }

    let cancelled = false;

    void resolveInstalledMediaUri(tourId, audioItem.url, mediaMap).then(
      (uri) => {
        if (!cancelled) {
          setResolved({ spotId: spot.id, uri: uri ?? null });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [mediaMap, spot, tourId]);

  useEffect(() => {
    if (
      !shouldPlay ||
      !spot ||
      !playbackUrl ||
      !remote.enableVoiceGuidance ||
      playedSpotIdRef.current === spot.id
    ) {
      return;
    }

    playedSpotIdRef.current = spot.id;
    player.replace(playbackUrl);
    player.play();
  }, [shouldPlay, spot, playbackUrl, remote.enableVoiceGuidance, player]);
}
