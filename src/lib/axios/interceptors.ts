import type { AxiosError } from "axios";

import { apiClient } from "@/lib/axios/client";
import { useAuthStore } from "@/store/auth-store";
import type { ApiErrorBody } from "@/types/api";

let initialized = false;

export function setupAxiosInterceptors() {
  if (initialized) {
    return;
  }

  apiClient.interceptors.request.use((config) => {
    const sessionToken = useAuthStore.getState().sessionToken;

    if (sessionToken) {
      config.headers.Authorization = `Bearer ${sessionToken}`;
    }

    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorBody>) => {
      const status = error.response?.status;

      if (status === 401) {
        await useAuthStore.getState().clearSession("session_expired");
      }

      return Promise.reject(error);
    },
  );

  initialized = true;
}
