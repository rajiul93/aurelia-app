import { apiClient } from "@/lib/axios/client";
import type { Host, DirectionsRequest, DirectionsResponse } from "@/types/host";

export const hostsService = {
  async listByTour(tourId: string): Promise<Host[]> {
    const response = await apiClient.get<Host[]>(
      `/app/tours/${tourId}/hosts`
    );
    return response.data;
  },

  async getDirections(
    tourId: string,
    hostId: string,
    request: DirectionsRequest
  ): Promise<DirectionsResponse> {
    const response = await apiClient.post<DirectionsResponse>(
      `/app/tours/${tourId}/hosts/${hostId}/directions`,
      request
    );
    return response.data;
  },
};
