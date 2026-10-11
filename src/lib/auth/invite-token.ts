import { createHash } from "node:crypto";

export function hashInviteAuthToken(tokenHash: string): string {
  return createHash("sha256").update(tokenHash, "utf8").digest("hex");
}
