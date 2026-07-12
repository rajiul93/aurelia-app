import { Directory, File } from "expo-file-system";

import { toCanonicalJson } from "@/lib/bundle/canonical-json";

const READ_RETRY_DELAYS_MS = [0, 100, 300, 600, 1200];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveTargetDirectory(directory: Directory, pathParts: string[]) {
  let targetDir = directory;

  for (const segment of pathParts.slice(0, -1)) {
    if (targetDir.list().some((entry) => entry.name === segment)) {
      targetDir = new Directory(targetDir, segment);
    } else {
      targetDir = targetDir.createDirectory(segment);
    }
  }

  return targetDir;
}

export function writeJsonFile(
  directory: Directory,
  pathParts: string[],
  value: unknown,
) {
  const fileName = pathParts[pathParts.length - 1]!;
  const targetDir = resolveTargetDirectory(directory, pathParts);
  const file = targetDir.createFile(fileName, "application/json");
  file.write(toCanonicalJson(value));

  if (!file.exists) {
    throw new Error(`Failed to persist ${pathParts.join("/")}`);
  }
}

export async function readJsonFile<T>(file: File): Promise<T | null> {
  for (const waitMs of READ_RETRY_DELAYS_MS) {
    if (waitMs > 0) {
      await delay(waitMs);
    }

    try {
      // A false `exists` must keep retrying rather than return: on a cold start
      // the filesystem can report a file missing for a moment, and reporting an
      // installed tour as "not installed" is far worse than a few extra reads.
      if (file.exists) {
        return JSON.parse(await file.text()) as T;
      }
    } catch {
      // Retry while the filesystem settles on cold start.
    }
  }

  return null;
}
