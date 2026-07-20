import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra as
  | {
      apiBaseUrl?: string;
      mobileApiKey?: string;
      apiVersion?: number;
      stripePublishableKey?: string;
    }
  | undefined;

/** Metro / Expo Go host on the LAN (works on physical devices). */
function resolveDevMachineHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const host = candidate.split(":")[0]?.trim();
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  return null;
}

function defaultApiBaseUrl() {
  const lanHost = resolveDevMachineHost();
  if (lanHost) {
    return `http://${lanHost}:3000/api/v1/app`;
  }

  // Android emulator loopback to host machine
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000/api/v1/app";
  }

  return "http://localhost:3000/api/v1/app";
}

function resolveApiBaseUrl() {
  const configured =
    process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl ?? null;

  if (!configured) {
    return defaultApiBaseUrl();
  }

  // Physical devices cannot reach the Mac via localhost — rewrite to LAN IP.
  if (
    configured.includes("localhost") ||
    configured.includes("127.0.0.1")
  ) {
    const lanHost = resolveDevMachineHost();
    if (lanHost) {
      return configured
        .replace("localhost", lanHost)
        .replace("127.0.0.1", lanHost);
    }
  }

  return configured;
}

/**
 * The API key must come from the environment. It used to fall back to
 * "your-app-key" — the placeholder committed in .env.example on both sides —
 * so a build where EXPO_PUBLIC_MOBILE_API_KEY failed to inline shipped a key
 * anyone could read out of the repo, and it looked like it worked.
 *
 * Falling back to "" instead means the server answers 401 and the home screen
 * shows its existing "Check API URL and MOBILE_API_KEY" message. Throwing here
 * would be louder but runs at import time, i.e. a crash on launch.
 */
function resolveMobileApiKey() {
  const configured =
    process.env.EXPO_PUBLIC_MOBILE_API_KEY ?? extra?.mobileApiKey ?? "";

  if (!configured && __DEV__) {
    console.warn(
      "[env] EXPO_PUBLIC_MOBILE_API_KEY is not set — every API call will 401. " +
        "Set it in .env to match MOBILE_API_KEY in the admin server.",
    );
  }

  return configured;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  mobileApiKey: resolveMobileApiKey(),
  apiVersion: Number(
    process.env.EXPO_PUBLIC_API_VERSION ?? extra?.apiVersion ?? 1,
  ),
  stripePublishableKey:
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    extra?.stripePublishableKey ??
    "",
};
