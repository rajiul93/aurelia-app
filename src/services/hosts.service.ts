import { apiClient } from "@/lib/axios/client";
import type { ApiSuccess } from "@/types/api";
import type { Host, DirectionsRequest, DirectionsResponse } from "@/types/host";

export const hostsService = {
  async listByTour(tourId: string): Promise<Host[]> {
    // baseURL is already …/api/v1/app — do not prefix with /app again
    const response = await apiClient.get<ApiSuccess<Host[]>>(
      `/tours/${tourId}/hosts`,
    );
    return response.data.data;
  },

  async getDirections(
    tourId: string,
    hostId: string,
    request: DirectionsRequest,
  ): Promise<DirectionsResponse> {
    const response = await apiClient.post<ApiSuccess<DirectionsResponse>>(
      `/tours/${tourId}/hosts/${hostId}/directions`,
      request,
    );
    return response.data.data;
  },
};
