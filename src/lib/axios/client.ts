import axios from "axios";

import { env } from "@/lib/env";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": env.mobileApiKey,
    "x-api-version": String(env.apiVersion),
  },
});
