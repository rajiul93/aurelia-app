import { useEffect } from "react";
import { AppState } from "react-native";

import { useKnowledgeStore } from "@/store/knowledge-store";

/**
 * Downloads (and re-encrypts) the offline knowledge pack after hydration and
 * whenever the app returns to the foreground. Non-blocking: a cached pack is
 * used until a fresher version is stored.
 */
export function KnowledgeSyncListener() {
  const hydrated = useKnowledgeStore((state) => state.hydrated);
  const sync = useKnowledgeStore((state) => state.sync);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void sync();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void sync();
      }
    });

    return () => subscription.remove();
  }, [hydrated, sync]);

  return null;
}
