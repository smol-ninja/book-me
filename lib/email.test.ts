import { afterEach, describe, expect, it, vi } from "vitest";
import { calendarCreatedEmailBody, notifyBooking } from "@/lib/email";

const EMAIL_KEYS = [
  "TWILIO_EMAIL_FROM",
  "TWILIO_EMAIL_FROM_NAME",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
] as const;

const snapshot = Object.fromEntries(
  EMAIL_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of EMAIL_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("calendarCreatedEmailBody", () => {
  it("includes the public and secret edit URLs", () => {
    const body = calendarCreatedEmailBody({
      username: "ada",
      publicUrl: "https://book-me-delta.vercel.app/ada",
      editUrl: "https://book-me-delta.vercel.app/setup/ada?key=secret",
    });
    expect(body).toContain("https://book-me-delta.vercel.app/ada");
    expect(body).toContain(
      "https://book-me-delta.vercel.app/setup/ada?key=secret",
    );
    expect(body).toContain("keep this private");
  });
});

describe("notifyBooking", () => {
  it("attaches invite.ics to host and guest emails", async () => {
    process.env.TWILIO_EMAIL_FROM = "bookings@example.com";
    process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    const fetchMock = vi.fn().mockResolvedValue({
      status: 202,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await notifyBooking({
      bookingId: "clxyz123",
      creatorEmail: "ada@example.com",
      creatorName: "Ada",
      guestName: "Grace",
      guestEmail: "grace@example.com",
      guestPhone: "+447496888124",
      itemName: "Dinner",
      durationMinutes: 90,
      startsAt: new Date("2026-09-10T18:00:00.000Z"),
      endsAt: new Date("2026-09-10T19:30:00.000Z"),
      timezone: "Europe/London",
      username: "ada",
      publicUrl: "https://book-me.example/ada",
    });

    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      const body = JSON.parse(String(init?.body)) as {
        content: {
          text: string;
          attachments: Array<{
            filename: string;
            contentType: string;
            content: string;
          }>;
        };
      };
      const [attachment] = body.content.attachments;
      expect(body.content.text).toContain("invite.ics");
      expect(body.content.attachments).toHaveLength(1);
      expect(attachment).toMatchObject({
        filename: "invite.ics",
        contentType: "text/calendar",
      });
      const ics = Buffer.from(attachment?.content ?? "", "base64").toString(
        "utf8",
      );
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("UID:booking-clxyz123@book-me");
      expect(ics).toContain("DTSTART:20260910T180000Z");
    }
  });
});
