import * as Crypto from "expo-crypto";

import { toCanonicalJson } from "@/lib/bundle/canonical-json";

export async function checksumJson(value: unknown) {
  const canonical = toCanonicalJson(value);
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonical,
  );
}
