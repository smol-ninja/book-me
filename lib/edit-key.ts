import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function createEditKey(): string {
  return randomBytes(24).toString("base64url");
}

export function hashEditKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function editKeysMatch(key: string, hash: string): boolean {
  const left = Buffer.from(hashEditKey(key), "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
