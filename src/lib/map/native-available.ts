import { TurboModuleRegistry } from "react-native";

export function isMapLibreNativeAvailable(): boolean {
  return TurboModuleRegistry.get("MLRNCameraModule") != null;
}
