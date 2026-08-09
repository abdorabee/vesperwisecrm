import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getDialerEncryptionKey(): Buffer {
  const raw = process.env.DIALER_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("DIALER_CREDENTIALS_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `DIALER_CREDENTIALS_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes, got ${key.length}`,
    );
  }
  return key;
}

export function encryptDialerSecret(plaintext: string): string {
  const key = getDialerEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptDialerSecret(ciphertext: string): string {
  const key = getDialerEncryptionKey();
  const packed = Buffer.from(ciphertext, "base64");
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
