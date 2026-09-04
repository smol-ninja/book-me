import { DateTime } from "luxon";

export const BUFFER_MINUTES = 30;
export const SLOT_STEP_MINUTES = 15;

export type BookingInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type GeneratedSlot = {
  startsAt: string;
  label: string;
};

function parseHm(hm: string): { hour: number; minute: number } {
  const [hour, minute] = hm.split(":").map((part) => Number(part));
  return { hour, minute };
}

export function zonedDateTime(
  date: string,
  timezone: string,
  hm: string,
): DateTime {
  const { hour, minute } = parseHm(hm);
  const dt = DateTime.fromISO(date, { zone: timezone }).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
  if (!dt.isValid) {
    throw new Error(`Invalid date/time in zone ${timezone}: ${date} ${hm}`);
  }
  return dt;
}

export function dayBoundsUtc(
  date: string,
  timezone: string,
  dayStart: string,
  dayEnd: string,
): { start: Date; end: Date } {
  return {
    start: zonedDateTime(date, timezone, dayStart).toJSDate(),
    end: zonedDateTime(date, timezone, dayEnd).toJSDate(),
  };
}

export function isSlotFree(
  start: DateTime,
  durationMinutes: number,
  bookings: BookingInterval[],
): boolean {
  const end = start.plus({ minutes: durationMinutes });
  return bookings.every((booking) => {
    const bookingStart = DateTime.fromJSDate(booking.startsAt, { zone: "utc" });
    const bookingEnd = DateTime.fromJSDate(booking.endsAt, { zone: "utc" });
    return (
      end.plus({ minutes: BUFFER_MINUTES }) <= bookingStart ||
      start >= bookingEnd.plus({ minutes: BUFFER_MINUTES })
    );
  });
}

export function generateSlotStarts(input: {
  date: string;
  timezone: string;
  dayStart: string;
  dayEnd: string;
  durationMinutes: number;
  bookings: BookingInterval[];
  now?: Date;
}): GeneratedSlot[] {
  const windowStart = zonedDateTime(input.date, input.timezone, input.dayStart);
  const windowEnd = zonedDateTime(input.date, input.timezone, input.dayEnd);
  const now = input.now
    ? DateTime.fromJSDate(input.now, { zone: "utc" })
    : null;

  const slots: GeneratedSlot[] = [];
  let cursor = windowStart;

  while (cursor.plus({ minutes: input.durationMinutes }) <= windowEnd) {
    const inFuture = !now || cursor > now;
    if (inFuture && isSlotFree(cursor, input.durationMinutes, input.bookings)) {
      const iso = cursor.toUTC().toISO();
      if (iso) {
        slots.push({
          startsAt: iso,
          label: cursor.toFormat("HH:mm"),
        });
      }
    }
    cursor = cursor.plus({ minutes: SLOT_STEP_MINUTES });
  }

  return slots;
}

export function formatRange(
  startsAt: Date,
  endsAt: Date,
  timezone: string,
): string {
  const start = DateTime.fromJSDate(startsAt, { zone: timezone });
  const end = DateTime.fromJSDate(endsAt, { zone: timezone });
  return `${start.toFormat("ccc d LLL yyyy, HH:mm")}–${end.toFormat("HH:mm")} (${timezone})`;
}

export function todayIso(timezone: string): string {
  const today = DateTime.now().setZone(timezone).toISODate();
  if (!today) throw new Error("Could not read today");
  return today;
}

export function isoDateRange(from: string, to: string): string[] {
  const startIso = from <= to ? from : to;
  const endIso = from <= to ? to : from;
  const dates: string[] = [];
  let cursor = DateTime.fromISO(startIso);
  const end = DateTime.fromISO(endIso);
  while (cursor <= end) {
    const iso = cursor.toISODate();
    if (iso) dates.push(iso);
    cursor = cursor.plus({ days: 1 });
  }
  return dates;
}
