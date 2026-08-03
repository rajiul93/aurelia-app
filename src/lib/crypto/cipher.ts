import { gcm } from "@noble/ciphers/aes.js";
import * as Crypto from "expo-crypto";

const IV_LENGTH = 12;

export async function createEncryptionIv() {
  return Crypto.getRandomBytesAsync(IV_LENGTH);
}

export function encryptBytes(
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
) {
  const cipher = gcm(key, iv);
  return cipher.encrypt(plaintext);
}

export function decryptBytes(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
) {
  const cipher = gcm(key, iv);
  return cipher.decrypt(ciphertext);
}

export function packEncryptedPayload(iv: Uint8Array, ciphertext: Uint8Array) {
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);
  return packed;
}

export function unpackEncryptedPayload(payload: Uint8Array) {
  return {
    iv: payload.slice(0, IV_LENGTH),
    ciphertext: payload.slice(IV_LENGTH),
  };
}

export { IV_LENGTH };
