import { apiClient } from "@/lib/axios/client";
import type { ApiSuccess } from "@/types/api";
import type { KnowledgePack } from "@/types/knowledge";

export const knowledgeService = {
  getPack() {
    return apiClient
      .get<ApiSuccess<KnowledgePack>>("/knowledge-pack")
      .then((response) => response.data);
  },
};
