import { Directory, File, Paths } from "expo-file-system";

import {
  createEncryptionIv,
  decryptBytes,
  encryptBytes,
  packEncryptedPayload,
  unpackEncryptedPayload,
} from "@/lib/crypto/media-cipher";
import { getOrCreateKnowledgeKey } from "@/lib/crypto/knowledge-key";
import type { KnowledgePack } from "@/types/knowledge";

function knowledgeDirectory() {
  return new Directory(Paths.document, "aurelia", "knowledge");
}

function packFile() {
  return new File(knowledgeDirectory(), "pack.enc");
}

function ensureDirectory(directory: Directory) {
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return directory;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Encrypt the knowledge pack JSON and write it to the app's document dir. */
export async function saveEncryptedPack(pack: KnowledgePack) {
  const key = await getOrCreateKnowledgeKey();
  const plaintext = encoder.encode(JSON.stringify(pack));
  const iv = await createEncryptionIv();
  const ciphertext = encryptBytes(key, iv, plaintext);
  const payload = packEncryptedPayload(iv, ciphertext);

  ensureDirectory(knowledgeDirectory());
  const file = packFile();
  if (!file.exists) {
    file.create({ overwrite: true });
  }
  file.write(payload);
}

/** Read and decrypt the stored knowledge pack, or null if none/undecryptable. */
export async function loadEncryptedPack(): Promise<KnowledgePack | null> {
  const file = packFile();
  if (!file.exists) {
    return null;
  }

  try {
    const payload = new Uint8Array(await file.arrayBuffer());
    const { iv, ciphertext } = unpackEncryptedPayload(payload);
    const key = await getOrCreateKnowledgeKey();
    const plaintext = decryptBytes(key, iv, ciphertext);
    return JSON.parse(decoder.decode(plaintext)) as KnowledgePack;
  } catch {
    return null;
  }
}

export function clearEncryptedPack() {
  const file = packFile();
  if (file.exists) {
    file.delete();
  }
}
