import {
  Directory,
  File,
  Paths,
  type DownloadPauseState,
  type DownloadProgress as FsDownloadProgress,
} from "expo-file-system";

const APP_ROOT = "aurelia";
const MODEL_DIRECTORY = "llm";
const MODEL_FILE = "model.gguf";

/**
 * Headroom demanded on top of the model's own size before a download starts.
 *
 * Filling the disk to the last byte breaks the *rest* of the app — tour bundles,
 * map packs and media all write to the same volume — so a download that would
 * technically fit is still refused.
 */
const REQUIRED_FREE_SPACE_MARGIN_BYTES = 300 * 1024 * 1024;

export type ModelSpec = {
  url: string;
  sizeBytes: number;
  /** Native MD5 of the finished file. Optional — size is always checked. */
  md5?: string | null;
};

export type ModelDownloadProgress = {
  bytesWritten: number;
  totalBytes: number;
  percent: number;
};

export type ModelStatus =
  | { state: "absent" }
  | { state: "downloading"; progress: ModelDownloadProgress }
  | { state: "paused" }
  | { state: "ready"; path: string; sizeBytes: number };

export class ModelDownloadError extends Error {
  constructor(
    message: string,
    readonly code:
      | "insufficient_space"
      | "size_mismatch"
      | "checksum_mismatch"
      | "network",
  ) {
    super(message);
    this.name = "ModelDownloadError";
  }
}

function modelDirectory() {
  return new Directory(Paths.document, APP_ROOT, MODEL_DIRECTORY);
}

export function modelFile() {
  return new File(modelDirectory(), MODEL_FILE);
}

function ensureModelDirectory() {
  const directory = modelDirectory();

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
}

/**
 * Absolute path llama.cpp should open, or null when no verified model is on
 * disk. Deliberately does not re-check the md5 — that costs a full read of a
 * ~0.5 GB file and already ran once at install time.
 */
export function getInstalledModelPath(): string | null {
  const file = modelFile();
  return file.exists && file.size > 0 ? file.uri : null;
}

export function getModelStatus(): ModelStatus {
  const file = modelFile();

  if (!file.exists || file.size === 0) {
    return { state: "absent" };
  }

  return { state: "ready", path: file.uri, sizeBytes: file.size };
}

export function deleteInstalledModel() {
  const file = modelFile();

  if (file.exists) {
    file.delete();
  }
}

function assertEnoughFreeSpace(spec: ModelSpec) {
  const required = spec.sizeBytes + REQUIRED_FREE_SPACE_MARGIN_BYTES;
  const available = Paths.availableDiskSpace;

  if (Number.isFinite(available) && available < required) {
    throw new ModelDownloadError(
      `Needs ${formatBytes(required)} free, ${formatBytes(available)} available.`,
      "insufficient_space",
    );
  }
}

/**
 * Verify what actually landed on disk.
 *
 * Size first because it is free and catches the common case (a truncated
 * transfer). The md5 is a native file digest, so a corrupt-but-right-length
 * file is caught too — without pulling half a gigabyte across the JS bridge.
 * A bad GGUF crashes llama.cpp inside native code rather than throwing, so this
 * check is what stands between a flaky download and a hard app crash.
 */
function verifyDownloadedModel(spec: ModelSpec) {
  const file = modelFile();

  if (file.size !== spec.sizeBytes) {
    file.delete();
    throw new ModelDownloadError(
      `Expected ${spec.sizeBytes} bytes, got ${file.size}.`,
      "size_mismatch",
    );
  }

  if (spec.md5) {
    const actual = file.md5;

    if (actual && actual.toLowerCase() !== spec.md5.toLowerCase()) {
      file.delete();
      throw new ModelDownloadError(
        "Downloaded model failed its integrity check.",
        "checksum_mismatch",
      );
    }
  }
}

function toProgress(
  event: FsDownloadProgress,
  spec: ModelSpec,
): ModelDownloadProgress {
  // The server may omit Content-Length, in which case totalBytes is -1; the
  // configured size is the honest fallback so the bar still moves.
  const totalBytes = event.totalBytes > 0 ? event.totalBytes : spec.sizeBytes;
  const percent =
    totalBytes > 0
      ? Math.min(100, Math.round((event.bytesWritten / totalBytes) * 100))
      : 0;

  return { bytesWritten: event.bytesWritten, totalBytes, percent };
}

export type ModelDownloadHandle = {
  /** Resolves true when the model is installed and verified, false if paused. */
  completion: Promise<boolean>;
  pause: () => Promise<DownloadPauseState | null>;
  cancel: () => void;
};

/**
 * Download the model, reporting progress.
 *
 * Resumable on purpose: this is a ~0.5 GB transfer that a tourist may well
 * start on hotel wifi and finish on mobile data, and restarting from zero on
 * every interruption would make it effectively undownloadable.
 */
export function startModelDownload(
  spec: ModelSpec,
  onProgress?: (progress: ModelDownloadProgress) => void,
): ModelDownloadHandle {
  assertEnoughFreeSpace(spec);
  ensureModelDirectory();

  // A previous partial or superseded file would otherwise make the destination
  // collide, and its bytes are worthless once the spec changed.
  deleteInstalledModel();

  const task = File.createDownloadTask(spec.url, modelFile(), {
    onProgress: (event) => onProgress?.(toProgress(event, spec)),
  });

  const completion = task
    .downloadAsync()
    .then((file) => {
      // null means paused, not finished — the caller resumes, and verification
      // must not run against a half-written file.
      if (!file) {
        return false;
      }

      verifyDownloadedModel(spec);
      return true;
    })
    .catch((error: unknown) => {
      if (error instanceof ModelDownloadError) {
        throw error;
      }

      throw new ModelDownloadError(
        error instanceof Error ? error.message : "Model download failed.",
        "network",
      );
    });

  return {
    completion,
    pause: async () => {
      await task.pauseAsync();
      return task.savable();
    },
    cancel: () => {
      task.cancel();
      deleteInstalledModel();
    },
  };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }

  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }

  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
