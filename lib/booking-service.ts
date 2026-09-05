import { DateTime } from "luxon";
import { appOrigin } from "@/lib/app-origin";
import { HttpError } from "@/lib/calendar-service";
import { editKeysMatch } from "@/lib/edit-key";
import { notifyBooking, normalizeEmail } from "@/lib/email";
import { toPublicCalendar } from "@/lib/mappers";
import { toE164 } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { dayBoundsUtc, generateSlotStarts } from "@/lib/slots";
import { normalizeUsername } from "@/lib/username";
import { bookInputSchema } from "@/lib/validation";

export async function listSlots(username: string, date: string, itemId: string) {
  const calendar = await prisma.calendar.findUnique({
    where: { username: normalizeUsername(username) },
    include: {
      items: {
        where: { id: itemId },
        select: { id: true, dates: true, durationMinutes: true },
      },
    },
  });
  if (!calendar) throw new HttpError("Calendar not found.", 404);

  const item = calendar.items[0];
  if (!item) throw new HttpError("Item not found.", 404);
  if (!calendar.openDates.includes(date) || !item.dates.includes(date)) {
    throw new HttpError("That item is not offered on this date.", 400);
  }

  const bounds = dayBoundsUtc(
    date,
    calendar.timezone,
    calendar.dayStart,
    calendar.dayEnd,
  );
  const dayBookings = await prisma.booking.findMany({
    where: {
      calendarId: calendar.id,
      startsAt: { gte: bounds.start, lt: bounds.end },
    },
    select: { startsAt: true, endsAt: true },
  });

  return generateSlotStarts({
    date,
    timezone: calendar.timezone,
    dayStart: calendar.dayStart,
    dayEnd: calendar.dayEnd,
    durationMinutes: item.durationMinutes,
    bookings: dayBookings,
    now: new Date(),
  });
}

export type CreatorBookingRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  itemName: string;
};

export type BookingDayGroup = {
  date: string;
  label: string;
  bookings: {
    id: string;
    timeRange: string;
    itemName: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    upcoming: boolean;
  }[];
};

export function groupBookingsByDate(
  bookings: CreatorBookingRow[],
  timezone: string,
  now: Date = new Date(),
): BookingDayGroup[] {
  const groups = new Map<string, BookingDayGroup>();

  for (const booking of bookings) {
    const start = DateTime.fromJSDate(booking.startsAt, { zone: timezone });
    const end = DateTime.fromJSDate(booking.endsAt, { zone: timezone });
    const date = start.toISODate();
    if (!date) continue;

    let group = groups.get(date);
    if (!group) {
      group = {
        date,
        label: start.toFormat("ccc d LLL yyyy"),
        bookings: [],
      };
      groups.set(date, group);
    }

    group.bookings.push({
      id: booking.id,
      timeRange: `${start.toFormat("HH:mm")}–${end.toFormat("HH:mm")}`,
      itemName: booking.itemName,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      upcoming: booking.endsAt >= now,
    });
  }

  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCreatorBookings(username: string, editKey: string | undefined) {
  const calendar = await prisma.calendar.findUnique({
    where: { username: normalizeUsername(username) },
    select: {
      id: true,
      username: true,
      displayName: true,
      timezone: true,
      editKeyHash: true,
    },
  });
  if (!calendar) return { status: "missing" } as const;
  if (!editKey || !editKeysMatch(editKey, calendar.editKeyHash)) {
    return { status: "forbidden" } as const;
  }

  const rows = await prisma.booking.findMany({
    where: { calendarId: calendar.id },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      item: { select: { name: true } },
    },
  });

  return {
    status: "ok" as const,
    calendar: {
      username: calendar.username,
      displayName: calendar.displayName,
      timezone: calendar.timezone,
    },
    bookings: rows.map((row) => ({
      id: row.id,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      guestName: row.guestName,
      guestEmail: row.guestEmail,
      guestPhone: row.guestPhone,
      itemName: row.item.name,
    })),
  };
}

export async function createBooking(body: unknown) {
  const parsed = bookInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(parsed.error.issues[0]?.message ?? "Invalid booking.", 400);
  }

  const username = normalizeUsername(parsed.data.username);
  const guestPhone = toE164(parsed.data.guestPhone);
  if (!guestPhone) {
    throw new HttpError("Enter a valid phone number with country code.", 400);
  }
  const guestEmail = normalizeEmail(parsed.data.guestEmail);
  if (!guestEmail) {
    throw new HttpError("Enter a valid email address.", 400);
  }

  const start = DateTime.fromISO(parsed.data.startsAt, { setZone: true });
  if (!start.isValid) {
    throw new HttpError("Invalid start time.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const calendar = await tx.calendar.findUnique({
      where: { username },
      include: { items: true },
    });
    if (!calendar) throw new HttpError("Calendar not found.", 404);

    await tx.$queryRaw`SELECT id FROM "Calendar" WHERE id = ${calendar.id} FOR UPDATE`;

    const item = calendar.items.find((row) => row.id === parsed.data.itemId);
    if (!item) throw new HttpError("Item not found.", 404);

    const localStart = start.setZone(calendar.timezone);
    const date = localStart.toISODate();
    if (!date) throw new HttpError("Invalid start time.", 400);
    if (!calendar.openDates.includes(date) || !item.dates.includes(date)) {
      throw new HttpError("That item is not offered on this date.", 400);
    }

    const bounds = dayBoundsUtc(
      date,
      calendar.timezone,
      calendar.dayStart,
      calendar.dayEnd,
    );
    const dayBookings = await tx.booking.findMany({
      where: {
        calendarId: calendar.id,
        startsAt: { gte: bounds.start, lt: bounds.end },
      },
    });

    const slots = generateSlotStarts({
      date,
      timezone: calendar.timezone,
      dayStart: calendar.dayStart,
      dayEnd: calendar.dayEnd,
      durationMinutes: item.durationMinutes,
      bookings: dayBookings,
      now: new Date(),
    });
    const chosen = slots.find((slot) => {
      const slotStart = DateTime.fromISO(slot.startsAt, { zone: "utc" });
      return Math.abs(slotStart.toMillis() - start.toUTC().toMillis()) < 1000;
    });
    if (!chosen) {
      throw new HttpError("That slot is no longer free.", 409);
    }

    const expected = DateTime.fromISO(chosen.startsAt, { zone: "utc" }).setZone(
      calendar.timezone,
    );
    const end = expected.plus({ minutes: item.durationMinutes });

    const booking = await tx.booking.create({
      data: {
        calendarId: calendar.id,
        itemId: item.id,
        startsAt: expected.toUTC().toJSDate(),
        endsAt: end.toUTC().toJSDate(),
        guestName: parsed.data.guestName,
        guestEmail,
        guestPhone,
      },
    });

    return { calendar, item, booking };
  });

  const emailed = await notifyBooking({
    bookingId: result.booking.id,
    creatorEmail: result.calendar.email,
    creatorName: result.calendar.displayName,
    guestName: parsed.data.guestName,
    guestEmail,
    guestPhone,
    itemName: result.item.name,
    durationMinutes: result.item.durationMinutes,
    startsAt: result.booking.startsAt,
    endsAt: result.booking.endsAt,
    timezone: result.calendar.timezone,
    username: result.calendar.username,
    publicUrl: `${appOrigin()}/${result.calendar.username}`,
  });

  return {
    ok: true as const,
    bookingId: result.booking.id,
    itemName: result.item.name,
    startsAt: result.booking.startsAt.toISOString(),
    endsAt: result.booking.endsAt.toISOString(),
    timezone: result.calendar.timezone,
    emailSent: emailed.sent,
    calendar: toPublicCalendar({ ...result.calendar, items: [result.item] }),
  };
}
