import { useEffect, useRef, useState } from "react";

import { ensureOfflineMapPack, readMapPackMeta } from "@/lib/map/offline-pack";
import type { BundleContent } from "@/types/bundle-content";

const MAP_READY_TIMEOUT_MS = 8_000;

/**
 * Ensures the offline tile pack exists before mounting MapLibre. Once ready for
 * a tour, stays ready — avoids unmounting the map when query cache refreshes.
 */
export function useMapPackReady(
  tourId: string | undefined,
  content: BundleContent | null | undefined,
) {
  const [ready, setReady] = useState(false);
  const readyTourIdRef = useRef<string | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;
  const contentTourId = content?.tour.id;

  useEffect(() => {
    if (!tourId || !contentTourId) {
      return;
    }

    if (readyTourIdRef.current === tourId) {
      setReady(true);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const activeContent = contentRef.current;

    if (!activeContent) {
      return;
    }

    void (async () => {
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          readyTourIdRef.current = tourId;
          setReady(true);
        }
      }, MAP_READY_TIMEOUT_MS);

      try {
        const meta = await readMapPackMeta(tourId);
        if (meta?.status === "ready") {
          if (!cancelled) {
            readyTourIdRef.current = tourId;
            setReady(true);
          }
          return;
        }

        await ensureOfflineMapPack(tourId, activeContent);
        if (!cancelled) {
          readyTourIdRef.current = tourId;
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          readyTourIdRef.current = tourId;
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [contentTourId, tourId]);

  useEffect(() => {
    if (!tourId || readyTourIdRef.current === tourId) {
      return;
    }

    readyTourIdRef.current = null;
    setReady(false);
  }, [tourId]);

  return ready;
}
