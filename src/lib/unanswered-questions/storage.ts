import { Directory, File, Paths } from "expo-file-system";

import type { UnansweredQuestionQueueSnapshot } from "./types";

const APP_ROOT = "aurelia";
const QUEUE_FILE = "unanswered-questions-queue.json";

function queueFile() {
  return new File(Paths.document, APP_ROOT, QUEUE_FILE);
}

function ensureAppRoot() {
  const directory = new Directory(Paths.document, APP_ROOT);

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
}

export async function loadQueueSnapshot(): Promise<UnansweredQuestionQueueSnapshot | null> {
  const file = queueFile();

  if (!file.exists) {
    return null;
  }

  try {
    const parsed = JSON.parse(await file.text()) as UnansweredQuestionQueueSnapshot;
    return Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveQueueSnapshot(snapshot: UnansweredQuestionQueueSnapshot) {
  ensureAppRoot();
  const file = queueFile();

  if (!file.exists) {
    file.create();
  }

  file.write(JSON.stringify(snapshot));
}
