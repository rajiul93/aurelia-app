import { apiClient } from "@/lib/axios/client";
import type { ApiSuccess } from "@/types/api";
import type { TourBundleDetail } from "@/types/tour-bundle";

export const downloadService = {
  fetchBundle(tourId: string) {
    return apiClient
      .post<ApiSuccess<TourBundleDetail>>(`/tours/${tourId}/download`)
      .then((response) => response.data);
  },
};
