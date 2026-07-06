import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { useAuthStore } from "@/store/auth-store";

export function AccessEndedListener() {
  const router = useRouter();
  const accessEndedReason = useAuthStore((state) => state.accessEndedReason);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (accessEndedReason !== "session_expired") {
      handledRef.current = null;
      return;
    }

    if (handledRef.current === "session_expired") {
      return;
    }

    handledRef.current = "session_expired";
    router.navigate("/explore");
  }, [accessEndedReason, router]);

  return null;
}
