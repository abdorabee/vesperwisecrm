import { beforeAll, describe, expect, test, vi } from "vitest";
import { randomBytes } from "node:crypto";

vi.mock("server-only", () => ({}));

let encryptDialerSecret: typeof import("../src/lib/dialer/credentials-crypto").encryptDialerSecret;
let decryptDialerSecret: typeof import("../src/lib/dialer/credentials-crypto").decryptDialerSecret;

beforeAll(async () => {
  process.env.DIALER_CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const mod = await import("../src/lib/dialer/credentials-crypto");
  encryptDialerSecret = mod.encryptDialerSecret;
  decryptDialerSecret = mod.decryptDialerSecret;
});

describe("dialer credential encryption", () => {
  test("round-trips a secret", () => {
    const plaintext = "test-auth-token-value";
    const ciphertext = encryptDialerSecret(plaintext);
    expect(decryptDialerSecret(ciphertext)).toBe(plaintext);
  });

  test("produces different ciphertext for the same plaintext on repeated calls", () => {
    const plaintext = "another-secret";
    const first = encryptDialerSecret(plaintext);
    const second = encryptDialerSecret(plaintext);
    expect(first).not.toBe(second);
    expect(decryptDialerSecret(first)).toBe(plaintext);
    expect(decryptDialerSecret(second)).toBe(plaintext);
  });

  test("throws when ciphertext has been tampered with", () => {
    const ciphertext = encryptDialerSecret("tamper-me");
    const bytes = Buffer.from(ciphertext, "base64");
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = bytes.toString("base64");
    expect(() => decryptDialerSecret(tampered)).toThrow();
  });

  test("throws when decrypted with the wrong key", async () => {
    const ciphertext = encryptDialerSecret("wrong-key-test");
    const originalKey = process.env.DIALER_CREDENTIALS_ENCRYPTION_KEY;
    process.env.DIALER_CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptDialerSecret(ciphertext)).toThrow();
    process.env.DIALER_CREDENTIALS_ENCRYPTION_KEY = originalKey;
  });
});
