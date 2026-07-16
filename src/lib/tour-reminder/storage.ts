import { Directory, File, Paths } from "expo-file-system";

import type { TourReminderSnapshot } from "./types";

const APP_ROOT = "aurelia";
const SNAPSHOT_FILE = "tour-reminders.json";

function snapshotFile() {
  return new File(Paths.document, APP_ROOT, SNAPSHOT_FILE);
}

function ensureAppRoot() {
  const directory = new Directory(Paths.document, APP_ROOT);

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
}

export async function loadTourReminderSnapshot(): Promise<TourReminderSnapshot | null> {
  const file = snapshotFile();

  if (!file.exists) {
    return null;
  }

  try {
    const parsed = JSON.parse(await file.text()) as TourReminderSnapshot;
    return parsed.byTourId ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveTourReminderSnapshot(snapshot: TourReminderSnapshot) {
  ensureAppRoot();
  const file = snapshotFile();

  if (!file.exists) {
    file.create();
  }

  file.write(JSON.stringify(snapshot));
}

export async function clearTourReminderSnapshot() {
  const file = snapshotFile();

  if (file.exists) {
    file.delete();
  }
}
