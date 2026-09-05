import { describe, expect, it } from "vitest";
import { groupBookingsByDate } from "@/lib/booking-service";

const timezone = "Europe/London";

describe("groupBookingsByDate", () => {
  it("groups by calendar timezone date, not UTC", () => {
    const groups = groupBookingsByDate(
      [
        {
          id: "1",
          startsAt: new Date("2026-09-10T23:00:00.000Z"),
          endsAt: new Date("2026-09-11T00:00:00.000Z"),
          guestName: "Ada",
          guestEmail: "ada@example.com",
          guestPhone: "+447496888124",
          itemName: "Dinner",
        },
      ],
      timezone,
      new Date("2026-09-01T12:00:00.000Z"),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.date).toBe("2026-09-11");
    expect(groups[0]?.bookings[0]?.timeRange).toBe("00:00–01:00");
    expect(groups[0]?.bookings[0]?.upcoming).toBe(true);
  });

  it("keeps separate dates apart and marks past bookings", () => {
    const groups = groupBookingsByDate(
      [
        {
          id: "past",
          startsAt: new Date("2026-09-10T10:00:00.000Z"),
          endsAt: new Date("2026-09-10T11:00:00.000Z"),
          guestName: "Past Guest",
          guestEmail: "past@example.com",
          guestPhone: "+447496888111",
          itemName: "Lunch",
        },
        {
          id: "soon",
          startsAt: new Date("2026-09-12T18:00:00.000Z"),
          endsAt: new Date("2026-09-12T19:30:00.000Z"),
          guestName: "Soon Guest",
          guestEmail: "soon@example.com",
          guestPhone: "+447496888122",
          itemName: "Dinner",
        },
      ],
      timezone,
      new Date("2026-09-11T12:00:00.000Z"),
    );

    expect(groups.map((group) => group.date)).toEqual([
      "2026-09-10",
      "2026-09-12",
    ]);
    expect(groups[0]?.bookings[0]?.upcoming).toBe(false);
    expect(groups[1]?.bookings[0]?.upcoming).toBe(true);
  });
});
