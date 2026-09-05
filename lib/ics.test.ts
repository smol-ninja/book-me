import { describe, expect, it } from "vitest";
import { buildBookingIcs } from "@/lib/ics";

function unfold(ics: string): string {
  return ics.replaceAll(/\r\n[ \t]/g, "");
}

const base = {
  bookingId: "clxyz123",
  itemName: "Dinner",
  durationMinutes: 90,
  startsAt: new Date("2026-09-10T18:00:00.000Z"),
  endsAt: new Date("2026-09-10T19:30:00.000Z"),
  timezone: "Europe/London",
  creatorName: "Ada",
  creatorEmail: "ada@example.com",
  guestName: "Grace",
  guestEmail: "grace@example.com",
  publicUrl: "https://book-me.example/ada",
  now: new Date("2026-09-01T12:00:00.000Z"),
};

describe("buildBookingIcs", () => {
  it("builds a UTC VEVENT the guest can import", () => {
    const ics = unfold(buildBookingIcs(base));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("UID:booking-clxyz123@book-me");
    expect(ics).toContain("DTSTAMP:20260901T120000Z");
    expect(ics).toContain("DTSTART:20260910T180000Z");
    expect(ics).toContain("DTEND:20260910T193000Z");
    expect(ics).toContain("SUMMARY:Dinner with Ada");
    expect(ics).toContain("ORGANIZER;CN=\"Ada\":mailto:ada@example.com");
    expect(ics).toContain(
      "ATTENDEE;CN=\"Grace\";RSVP=FALSE:mailto:grace@example.com",
    );
    expect(ics).toContain("URL:https://book-me.example/ada");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes commas and semicolons in text fields", () => {
    const ics = unfold(
      buildBookingIcs({
        ...base,
        itemName: "Dinner; tasting, plus cake",
      }),
    );
    expect(ics).toContain("SUMMARY:Dinner\\; tasting\\, plus cake with Ada");
  });

  it("folds lines longer than 75 octets", () => {
    const ics = buildBookingIcs({
      ...base,
      itemName: "A".repeat(80),
    });
    const longLine = ics
      .split("\r\n")
      .find((line) => line.startsWith("SUMMARY:"));
    expect(longLine).toBeDefined();
    expect(Buffer.byteLength(longLine ?? "", "utf8")).toBeLessThanOrEqual(75);
    expect(ics).toContain("\r\n A");
  });
});
