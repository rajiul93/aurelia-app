import { Directory, File, Paths } from "expo-file-system";

import type { EntitlementsSnapshot } from "@/types/auth";

const APP_ROOT = "aurelia";
const SNAPSHOT_FILE = "entitlements.json";

function snapshotFile() {
  return new File(Paths.document, APP_ROOT, SNAPSHOT_FILE);
}

function ensureAppRoot() {
  const directory = new Directory(Paths.document, APP_ROOT);

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
}

export async function loadEntitlementsSnapshot() {
  const file = snapshotFile();

  if (!file.exists) {
    return null;
  }

  try {
    const parsed = JSON.parse(await file.text()) as EntitlementsSnapshot;
    return parsed.entitlements ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveEntitlementsSnapshot(snapshot: EntitlementsSnapshot) {
  ensureAppRoot();
  const file = snapshotFile();

  if (!file.exists) {
    file.create();
  }

  file.write(JSON.stringify(snapshot));
}

export async function clearEntitlementsSnapshot() {
  const file = snapshotFile();

  if (file.exists) {
    file.delete();
  }
}
