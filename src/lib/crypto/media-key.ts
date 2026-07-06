import * as Crypto from "expo-crypto";

import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "@/lib/secure-storage";

const KEY_PREFIX = "aurelia.mediaKey.";

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

export async function getOrCreateTourMediaKey(tourId: string) {
  const existing = await getSecureItem(`${KEY_PREFIX}${tourId}`);

  if (existing) {
    return base64ToBytes(existing);
  }

  const key = await Crypto.getRandomBytesAsync(32);
  await setSecureItem(`${KEY_PREFIX}${tourId}`, bytesToBase64(key));

  return key;
}

export async function deleteTourMediaKey(tourId: string) {
  await deleteSecureItem(`${KEY_PREFIX}${tourId}`);
}
