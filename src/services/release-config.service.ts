import { apiClient } from "@/lib/axios/client";
import type { ApiSuccess } from "@/types/api";
import type { ReleaseConfig } from "@/types/release-config";

export type ReleaseConfigResponse = Omit<ReleaseConfig, "syncedAt">;

export const releaseConfigService = {
  get() {
    return apiClient
      .get<ApiSuccess<ReleaseConfigResponse>>("/release-config")
      .then((response) => response.data);
  },
};
