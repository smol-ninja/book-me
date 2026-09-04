import type { Booking, Calendar, Item } from "@prisma/client";
import type { PublicCalendar, PublicItem } from "@/lib/types";

type CalendarWithItems = Calendar & { items: Item[] };

export function toPublicItem(item: Item): PublicItem {
  return {
    id: item.id,
    name: item.name,
    durationMinutes: item.durationMinutes,
    dates: [...item.dates].sort(),
  };
}

export function toPublicCalendar(calendar: CalendarWithItems): PublicCalendar {
  return {
    username: calendar.username,
    displayName: calendar.displayName,
    timezone: calendar.timezone,
    dayStart: calendar.dayStart,
    dayEnd: calendar.dayEnd,
    openDates: [...calendar.openDates].sort(),
    items: calendar.items.map(toPublicItem),
  };
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export type { Booking };
