import { Directory, File, Paths } from "expo-file-system";

import {
  createEncryptionIv,
  decryptBytes,
  encryptBytes,
  packEncryptedPayload,
  unpackEncryptedPayload,
} from "@/lib/crypto/media-cipher";
import { getOrCreateTourMediaKey } from "@/lib/crypto/media-key";
import { getInstalledTourDirectory } from "@/lib/bundle/tour-directory";

function decryptedCacheDirectory(tourId: string) {
  return new Directory(Paths.cache, "aurelia", "decrypted", tourId);
}

function ensureDirectory(directory: Directory) {
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }

  return directory;
}

function hashCacheKey(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

export async function encryptFileInPlace(
  tourId: string,
  sourceFile: File,
  encryptedRelativePath: string,
) {
  const key = await getOrCreateTourMediaKey(tourId);
  const plaintext = new Uint8Array(await sourceFile.arrayBuffer());
  const iv = await createEncryptionIv();
  const ciphertext = encryptBytes(key, iv, plaintext);
  const payload = packEncryptedPayload(iv, ciphertext);

  const encryptedFile = new File(
    getInstalledTourDirectory(tourId),
    encryptedRelativePath,
  );
  encryptedFile.write(payload);

  if (sourceFile.uri !== encryptedFile.uri && sourceFile.exists) {
    sourceFile.delete();
  }

  return encryptedRelativePath;
}

export async function decryptMediaToCacheUri(
  tourId: string,
  encryptedRelativePath: string,
  cacheKey: string,
) {
  const encryptedFile = new File(
    getInstalledTourDirectory(tourId),
    encryptedRelativePath,
  );

  if (!encryptedFile.exists) {
    return null;
  }

  const cacheDir = ensureDirectory(decryptedCacheDirectory(tourId));
  const extension = encryptedRelativePath.includes(".")
    ? encryptedRelativePath.slice(encryptedRelativePath.lastIndexOf("."))
    : ".bin";
  const cacheFile = new File(cacheDir, `${hashCacheKey(cacheKey)}${extension}`);

  if (cacheFile.exists) {
    return cacheFile.uri;
  }

  const payload = new Uint8Array(await encryptedFile.arrayBuffer());
  const { iv, ciphertext } = unpackEncryptedPayload(payload);
  const key = await getOrCreateTourMediaKey(tourId);
  const plaintext = decryptBytes(key, iv, ciphertext);

  if (!cacheFile.exists) {
    cacheFile.create();
  }

  cacheFile.write(plaintext);
  return cacheFile.uri;
}

export function clearDecryptedMediaCache(tourId: string) {
  const directory = decryptedCacheDirectory(tourId);

  if (directory.exists) {
    directory.delete();
  }
}
