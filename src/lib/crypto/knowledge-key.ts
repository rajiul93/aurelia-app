import * as Crypto from "expo-crypto";

import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "@/lib/secure-storage";

const KNOWLEDGE_KEY_ID = "aurelia.knowledgeKey";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Single device-wide AES-256 key for the encrypted offline knowledge pack. */
export async function getOrCreateKnowledgeKey() {
  const existing = await getSecureItem(KNOWLEDGE_KEY_ID);
  if (existing) {
    return base64ToBytes(existing);
  }

  const key = await Crypto.getRandomBytesAsync(32);
  await setSecureItem(KNOWLEDGE_KEY_ID, bytesToBase64(key));
  return key;
}

export async function deleteKnowledgeKey() {
  await deleteSecureItem(KNOWLEDGE_KEY_ID);
}
