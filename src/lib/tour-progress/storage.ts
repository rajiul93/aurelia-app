import { Directory, File, Paths } from "expo-file-system";

const APP_ROOT = "aurelia";
const PROGRESS_FILE = "tour-progress.json";

export type TourProgressRecord = {
  completedSpotIds: string[];
  updatedAt: string;
};

export type TourProgressIndex = Record<string, TourProgressRecord>;

function progressFile() {
  return new File(Paths.document, APP_ROOT, PROGRESS_FILE);
}

function ensureAppRoot() {
  const directory = new Directory(Paths.document, APP_ROOT);

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
}

export async function loadTourProgressIndex() {
  const file = progressFile();

  if (!file.exists) {
    return {} as TourProgressIndex;
  }

  try {
    return JSON.parse(await file.text()) as TourProgressIndex;
  } catch {
    return {} as TourProgressIndex;
  }
}

export async function saveTourProgressIndex(index: TourProgressIndex) {
  ensureAppRoot();
  const file = progressFile();

  if (!file.exists) {
    file.create();
  }

  file.write(JSON.stringify(index));
}

export async function loadTourProgress(tourId: string) {
  const index = await loadTourProgressIndex();
  return index[tourId] ?? { completedSpotIds: [], updatedAt: "" };
}

export async function saveTourProgress(
  tourId: string,
  record: TourProgressRecord,
) {
  const index = await loadTourProgressIndex();
  index[tourId] = record;
  await saveTourProgressIndex(index);
}

export async function removeTourProgress(tourId: string) {
  const index = await loadTourProgressIndex();

  if (!(tourId in index)) {
    return;
  }

  delete index[tourId];
  await saveTourProgressIndex(index);
}
