import { RESERVED_USERNAMES } from "@/lib/constants";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 30) {
    return "Use 3–30 characters.";
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(username)) {
    return "Use lowercase letters, numbers, and hyphens.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "That name is reserved.";
  }
  return null;
}
