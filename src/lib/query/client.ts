import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      // Filesystem-backed queries (installed tour content, media map) must
      // resolve immediately when offline instead of being paused/retried by
      // react-query's default "online" network mode.
      networkMode: "offlineFirst",
    },
  },
});
