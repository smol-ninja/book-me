import { afterEach, describe, expect, it } from "vitest";
import { appOrigin, calendarShareUrls } from "@/lib/app-origin";

const KEYS = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const snapshot = Object.fromEntries(
  KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("appOrigin", () => {
  it("prefers APP_URL over the request host", () => {
    process.env.APP_URL = "https://book-me-delta.vercel.app/";
    const origin = appOrigin(
      new Request("http://localhost:3000/api/calendars", {
        headers: { host: "localhost:3000" },
      }),
    );
    expect(origin).toBe("https://book-me-delta.vercel.app");
  });

  it("uses the forwarded host when no APP_URL is set", () => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    const origin = appOrigin(
      new Request("https://example.test/api/calendars", {
        headers: {
          host: "preview.example.test",
          "x-forwarded-host": "book-me-delta.vercel.app",
          "x-forwarded-proto": "https",
        },
      }),
    );
    expect(origin).toBe("https://book-me-delta.vercel.app");
  });
});

describe("calendarShareUrls", () => {
  it("builds public and secret edit URLs", () => {
    expect(
      calendarShareUrls("https://book-me-delta.vercel.app", "ada", "secret+key"),
    ).toEqual({
      publicUrl: "https://book-me-delta.vercel.app/ada",
      editUrl: "https://book-me-delta.vercel.app/setup/ada?key=secret%2Bkey",
    });
  });
});
