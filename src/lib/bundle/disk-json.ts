import { Directory, File } from "expo-file-system";

import { toCanonicalJson } from "@/lib/bundle/canonical-json";

const READ_RETRY_DELAYS_MS = [0, 50, 150];

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
      if (!file.exists) {
        return null;
      }

      return JSON.parse(await file.text()) as T;
    } catch {
      // Retry while the filesystem settles on cold start.
    }
  }

  return null;
}
