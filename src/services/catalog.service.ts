import { apiClient } from "@/lib/axios/client";
import type { ApiSuccess } from "@/types/api";
import type { CatalogTour } from "@/types/catalog";

export const catalogService = {
  listTours(language?: string) {
    return apiClient
      .get<ApiSuccess<CatalogTour[]>>("/catalog/tours", {
        params: language ? { language } : undefined,
      })
      .then((response) => response.data);
  },
};
