import { Directory, File, Paths } from "expo-file-system";

import type { ReleaseConfig } from "@/types/release-config";

const APP_ROOT = "aurelia";
const CONFIG_FILE = "release-config.json";

function configFile() {
  return new File(Paths.document, APP_ROOT, CONFIG_FILE);
}

function ensureAppRoot() {
  const directory = new Directory(Paths.document, APP_ROOT);

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
}

export async function loadCachedReleaseConfig() {
  const file = configFile();

  if (!file.exists) {
    return null;
  }

  try {
    return JSON.parse(await file.text()) as ReleaseConfig;
  } catch {
    return null;
  }
}

export async function saveCachedReleaseConfig(config: ReleaseConfig) {
  ensureAppRoot();
  const file = configFile();

  if (!file.exists) {
    file.create();
  }

  file.write(JSON.stringify(config));
}
