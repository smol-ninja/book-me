import type { Calendar, Item, Prisma } from "@prisma/client";
import { createEditKey, editKeysMatch, hashEditKey } from "@/lib/edit-key";
import { uniqueSorted } from "@/lib/mappers";
import { toE164 } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/username";
import { calendarInputSchema } from "@/lib/validation";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type CalendarPayload = {
  username: string;
  displayName: string;
  phone: string;
  timezone: string;
  dayStart: string;
  dayEnd: string;
  openDates: string[];
  items: {
    id?: string;
    name: string;
    durationMinutes: number;
    dates: string[];
  }[];
  editKey?: string;
};

function parseCalendarPayload(body: unknown): CalendarPayload {
  const parsed = calendarInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(issue?.message ?? "Invalid calendar.", 400);
  }
  const phone = toE164(parsed.data.phone);
  if (!phone) {
    throw new HttpError("Enter a valid phone number with country code.", 400);
  }
  return {
    ...parsed.data,
    username: normalizeUsername(parsed.data.username),
    phone,
    openDates: uniqueSorted(parsed.data.openDates),
    items: parsed.data.items.map((item) => ({
      ...item,
      dates: uniqueSorted(item.dates),
    })),
  };
}

async function syncItems(
  tx: Prisma.TransactionClient,
  calendarId: string,
  items: CalendarPayload["items"],
) {
  const existing = await tx.item.findMany({
    where: { calendarId },
    include: { _count: { select: { bookings: true } } },
  });
  const incomingIds = new Set(
    items.map((item) => item.id).filter((id): id is string => Boolean(id)),
  );

  for (const row of existing) {
    if (!incomingIds.has(row.id) && row._count.bookings === 0) {
      await tx.item.delete({ where: { id: row.id } });
    }
  }

  const saved: Item[] = [];
  for (const item of items) {
    if (item.id && existing.some((row) => row.id === item.id)) {
      saved.push(
        await tx.item.update({
          where: { id: item.id },
          data: {
            name: item.name,
            durationMinutes: item.durationMinutes,
            dates: item.dates,
          },
        }),
      );
    } else {
      saved.push(
        await tx.item.create({
          data: {
            calendarId,
            name: item.name,
            durationMinutes: item.durationMinutes,
            dates: item.dates,
          },
        }),
      );
    }
  }
  return saved;
}

export async function createCalendar(body: unknown): Promise<{
  calendar: Calendar & { items: Item[] };
  editKey: string;
}> {
  const payload = parseCalendarPayload(body);
  const taken = await prisma.calendar.findUnique({
    where: { username: payload.username },
  });
  if (taken) {
    throw new HttpError("That username is already taken.", 409);
  }

  const editKey = createEditKey();
  const calendar = await prisma.$transaction(async (tx) => {
    const created = await tx.calendar.create({
      data: {
        username: payload.username,
        displayName: payload.displayName,
        phoneE164: payload.phone,
        timezone: payload.timezone,
        dayStart: payload.dayStart,
        dayEnd: payload.dayEnd,
        openDates: payload.openDates,
        editKeyHash: hashEditKey(editKey),
      },
    });
    await syncItems(tx, created.id, payload.items);
    return tx.calendar.findUniqueOrThrow({
      where: { id: created.id },
      include: { items: true },
    });
  });

  return { calendar, editKey };
}

export async function updateCalendar(
  username: string,
  body: unknown,
): Promise<Calendar & { items: Item[] }> {
  const payload = parseCalendarPayload({ ...asObject(body), username });
  if (!payload.editKey) {
    throw new HttpError("Edit key required.", 401);
  }
  const existing = await prisma.calendar.findUnique({
    where: { username: payload.username },
  });
  if (!existing) {
    throw new HttpError("Calendar not found.", 404);
  }
  if (!editKeysMatch(payload.editKey, existing.editKeyHash)) {
    throw new HttpError("Edit key does not match.", 403);
  }

  return prisma.$transaction(async (tx) => {
    await tx.calendar.update({
      where: { id: existing.id },
      data: {
        displayName: payload.displayName,
        phoneE164: payload.phone,
        timezone: payload.timezone,
        dayStart: payload.dayStart,
        dayEnd: payload.dayEnd,
        openDates: payload.openDates,
      },
    });
    await syncItems(tx, existing.id, payload.items);
    return tx.calendar.findUniqueOrThrow({
      where: { id: existing.id },
      include: { items: true },
    });
  });
}

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export async function getCalendarByUsername(username: string) {
  return prisma.calendar.findUnique({
    where: { username: normalizeUsername(username) },
    include: { items: true },
  });
}
