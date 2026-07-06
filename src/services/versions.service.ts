import { apiClient } from "@/lib/axios/client";
import type { ApiSuccess } from "@/types/api";

export type VersionsMap = {
  apiVersion: number;
  schemaVersion: number;
  appContentVersion: number;
  remoteConfigVersion?: number;
  tours?: Array<{
    tourId: string;
    slug: string;
    tourBundleVersion: number;
    mediaVersion: number;
    aiKnowledgeVersion: number;
    routeVersion: number;
  }>;
};

export const versionsService = {
  get() {
    return apiClient
      .get<ApiSuccess<VersionsMap>>("/versions")
      .then((response) => response.data);
  },
};
