import type { AxiosError } from "axios";

import type { ApiErrorBody } from "@/types/api";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
) {
  if (error instanceof Error && error.message === "Network Error") {
    return "Cannot reach the server. Check your connection and API URL.";
  }

  const axiosError = error as AxiosError<ApiErrorBody>;
  const message = axiosError.response?.data?.error?.message;

  if (message) {
    return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
