import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function mintIntakeToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashIntakeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isWellFormedIntakeToken(token: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return false;
  }
  return Buffer.from(token, "base64url").length === TOKEN_BYTES;
}
