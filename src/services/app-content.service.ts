import { apiClient } from "@/lib/axios/client";
import type { ApiSuccess } from "@/types/api";
import type { AppContentBundle } from "@/types/app-content";

export const appContentService = {
  get(language: string) {
    return apiClient
      .get<ApiSuccess<AppContentBundle>>("/app-content", {
        params: { language },
      })
      .then((response) => response.data);
  },
};
