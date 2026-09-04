import { DateTime } from "luxon";
import { HttpError } from "@/lib/calendar-service";
import { toPublicCalendar } from "@/lib/mappers";
import { toE164 } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { dayBoundsUtc, generateSlotStarts } from "@/lib/slots";
import { normalizeUsername } from "@/lib/username";
import { bookInputSchema } from "@/lib/validation";
import { notifyBooking } from "@/lib/whatsapp";

export async function listSlots(username: string, date: string, itemId: string) {
  const calendar = await prisma.calendar.findUnique({
    where: { username: normalizeUsername(username) },
    include: { items: true, bookings: true },
  });
  if (!calendar) throw new HttpError("Calendar not found.", 404);

  const item = calendar.items.find((row) => row.id === itemId);
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
  const dayBookings = calendar.bookings.filter(
    (booking) =>
      booking.startsAt >= bounds.start && booking.startsAt < bounds.end,
  );

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
        guestPhone,
      },
    });

    return { calendar, item, booking };
  });

  const whatsapp = await notifyBooking({
    creatorPhone: result.calendar.phoneE164,
    creatorName: result.calendar.displayName,
    guestName: parsed.data.guestName,
    guestPhone,
    itemName: result.item.name,
    durationMinutes: result.item.durationMinutes,
    startsAt: result.booking.startsAt,
    endsAt: result.booking.endsAt,
    timezone: result.calendar.timezone,
    username: result.calendar.username,
  });

  return {
    ok: true as const,
    bookingId: result.booking.id,
    itemName: result.item.name,
    startsAt: result.booking.startsAt.toISOString(),
    endsAt: result.booking.endsAt.toISOString(),
    timezone: result.calendar.timezone,
    whatsappSent: whatsapp.sent,
    calendar: toPublicCalendar({ ...result.calendar, items: [result.item] }),
  };
}
