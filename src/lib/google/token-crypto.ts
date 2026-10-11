import "server-only";

import {
  decryptDialerSecret,
  encryptDialerSecret,
} from "@/lib/dialer/credentials-crypto";

// Same AES-256-GCM packing and server key as dialer credentials
// (DIALER_CREDENTIALS_ENCRYPTION_KEY). The prefix marks ciphertext so a
// legacy plaintext row can be rewritten on the next server read.
const PREFIX = "enc:v1:";

export function encryptGoogleToken(plaintext: string): string {
  return `${PREFIX}${encryptDialerSecret(plaintext)}`;
}

export function decryptGoogleToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }
  return decryptDialerSecret(stored.slice(PREFIX.length));
}

export function isEncryptedGoogleToken(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
