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
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const player = useAudioPlayer(playbackUrl ?? "", {
    downloadFirst: true,
  });

  useEffect(() => {
    playedSpotIdRef.current = null;
    setPlaybackUrl(null);
  }, [spot?.id]);

  useEffect(() => {
    const audioItem = spot ? getSpotMediaByType(spot, "AUDIO")[0] : null;

    if (!audioItem || !mediaMap) {
      setPlaybackUrl(null);
      return;
    }

    void resolveInstalledMediaUri(tourId, audioItem.url, mediaMap).then(
      (uri) => {
        setPlaybackUrl(uri ?? null);
      },
    );
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
