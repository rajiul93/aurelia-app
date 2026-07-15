import { useMutation } from "@tanstack/react-query";
import { hostsService } from "@/services/hosts.service";
import type { DirectionsRequest, DirectionsResponse } from "@/types/host";

export function useHostDirections() {
  return useMutation<
    DirectionsResponse,
    Error,
    { tourId: string; hostId: string; request: DirectionsRequest }
  >({
    mutationFn: async ({ tourId, hostId, request }) => {
      return hostsService.getDirections(tourId, hostId, request);
    },
    retry: 1,
  });
}
