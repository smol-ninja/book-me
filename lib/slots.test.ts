import { describe, expect, test } from "vitest";
import { DateTime } from "luxon";
import {
  BUFFER_MINUTES,
  generateSlotStarts,
  isSlotFree,
  zonedDateTime,
} from "@/lib/slots";

const timezone = "Europe/London";
const date = "2026-09-10";
const dayStart = "09:00";
const dayEnd = "21:00";

function at(hm: string) {
  return zonedDateTime(date, timezone, hm);
}

describe("generateSlotStarts", () => {
  test("fills the window in 15 minute steps and drops overflow", () => {
    const hourSlots = generateSlotStarts({
      date,
      timezone,
      dayStart,
      dayEnd,
      durationMinutes: 60,
      bookings: [],
    });
    expect(hourSlots[0]?.label).toBe("09:00");
    expect(hourSlots.at(-1)?.label).toBe("20:00");

    const longSlots = generateSlotStarts({
      date,
      timezone,
      dayStart,
      dayEnd,
      durationMinutes: 90,
      bookings: [],
    });
    expect(longSlots.at(-1)?.label).toBe("19:30");
  });

  test("keeps a 30 minute buffer after an existing booking", () => {
    const bookingStart = at("10:00");
    const bookingEnd = bookingStart.plus({ minutes: 60 });
    const slots = generateSlotStarts({
      date,
      timezone,
      dayStart,
      dayEnd,
      durationMinutes: 60,
      bookings: [
        { startsAt: bookingStart.toJSDate(), endsAt: bookingEnd.toJSDate() },
      ],
    });
    const labels = slots.map((slot) => slot.label);
    expect(labels).not.toContain("10:00");
    expect(labels).not.toContain("10:15");
    expect(labels).not.toContain("11:00");
    expect(labels).not.toContain("11:15");
    expect(labels).toContain("11:30");
  });

  test("keeps a 30 minute buffer before an existing booking", () => {
    const bookingStart = at("12:00");
    const bookingEnd = bookingStart.plus({ minutes: 60 });
    expect(
      isSlotFree(at("10:30"), 60, [
        { startsAt: bookingStart.toJSDate(), endsAt: bookingEnd.toJSDate() },
      ]),
    ).toBe(true);
    expect(
      isSlotFree(at("11:00"), 60, [
        { startsAt: bookingStart.toJSDate(), endsAt: bookingEnd.toJSDate() },
      ]),
    ).toBe(false);
  });

  test("treats bookings for different items as one shared timeline", () => {
    const dinner = {
      startsAt: at("18:00").toJSDate(),
      endsAt: at("18:00").plus({ minutes: 90 }).toJSDate(),
    };
    const slots = generateSlotStarts({
      date,
      timezone,
      dayStart,
      dayEnd,
      durationMinutes: 60,
      bookings: [dinner],
    });
    const labels = slots.map((slot) => slot.label);
    expect(labels).not.toContain("18:00");
    expect(labels).not.toContain("19:30");
    expect(labels).toContain("20:00");
  });

  test("hides starts that are already in the past", () => {
    const now = DateTime.fromISO("2026-09-10T12:00:00", { zone: timezone });
    const slots = generateSlotStarts({
      date,
      timezone,
      dayStart,
      dayEnd,
      durationMinutes: 60,
      bookings: [],
      now: now.toJSDate(),
    });
    expect(slots[0]?.label).toBe("12:15");
  });
});

describe("buffer constant", () => {
  test("is 30 minutes", () => {
    expect(BUFFER_MINUTES).toBe(30);
  });
});
