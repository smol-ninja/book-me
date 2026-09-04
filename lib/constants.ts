export const DEFAULT_TIMEZONE = "Europe/London";
export const DEFAULT_DAY_START = "09:00";
export const DEFAULT_DAY_END = "21:00";

export const RESERVED_USERNAMES = new Set([
  "api",
  "setup",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "_next",
  "assets",
  "static",
  "admin",
  "login",
  "health",
  "not-found",
]);

export const TIMEZONES = [
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;

export const DURATION_PRESETS = [30, 45, 60, 90, 120, 180] as const;
