import { DateTime } from "luxon";
import { formatRange } from "@/lib/slots";

const CRLF = "\r\n";
const MAX_LINE_OCTETS = 75;

export type BookingIcsInput = {
  bookingId: string;
  itemName: string;
  durationMinutes: number;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  creatorName: string;
  creatorEmail: string;
  guestName: string;
  guestEmail: string;
  publicUrl?: string;
  now?: Date;
};

function icsUtc(date: Date): string {
  return DateTime.fromJSDate(date, { zone: "utc" }).toFormat(
    "yyyyLLdd'T'HHmmss'Z'",
  );
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");
}

function quotedCn(value: string): string {
  const cleaned = value.replaceAll(/[\r\n"]/g, "").trim() || "Book-me";
  return `"${cleaned}"`;
}

function foldIcsLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= MAX_LINE_OCTETS) return line;

  const parts: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const budget = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    let end = Math.min(offset + budget, bytes.length);
    while (end > offset && (bytes[end]! & 0b1100_0000) === 0b1000_0000) {
      end -= 1;
    }
    if (end === offset) {
      end = Math.min(offset + 1, bytes.length);
    }
    parts.push(bytes.subarray(offset, end).toString("utf8"));
    offset = end;
  }
  return parts.join(`${CRLF} `);
}

function icsLines(lines: string[]): string {
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}

export function buildBookingIcs(input: BookingIcsInput): string {
  const when = formatRange(input.startsAt, input.endsAt, input.timezone);
  const description = [
    `${input.itemName} (${input.durationMinutes} min)`,
    `When: ${when}`,
    `Host: ${input.creatorName}`,
    `Guest: ${input.guestName}`,
    ...(input.publicUrl ? [input.publicUrl] : []),
  ].join("\n");

  return icsLines([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Book-me//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${input.bookingId}@book-me`,
    `DTSTAMP:${icsUtc(input.now ?? new Date())}`,
    `DTSTART:${icsUtc(input.startsAt)}`,
    `DTEND:${icsUtc(input.endsAt)}`,
    `SUMMARY:${escapeIcsText(`${input.itemName} with ${input.creatorName}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `ORGANIZER;CN=${quotedCn(input.creatorName)}:mailto:${input.creatorEmail}`,
    `ATTENDEE;CN=${quotedCn(input.guestName)};RSVP=FALSE:mailto:${input.guestEmail}`,
    ...(input.publicUrl ? [`URL:${input.publicUrl}`] : []),
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ]);
}
