import { DateTime } from "luxon";
import { z } from "zod";
import { normalizeUsername, validateUsername } from "@/lib/username";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates.");
const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm times.");

export const itemInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(40),
  durationMinutes: z.number().int().min(15).max(480),
  dates: z.array(isoDate).min(1),
});

export const calendarInputSchema = z
  .object({
    username: z.string(),
    displayName: z.string().trim().min(1).max(60),
    email: z.string().min(3).max(120),
    phone: z.string().min(5).max(30),
    timezone: z.string().min(1),
    dayStart: hm,
    dayEnd: hm,
    openDates: z.array(isoDate).min(1),
    items: z.array(itemInputSchema).min(1),
    editKey: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const username = normalizeUsername(value.username);
    const usernameError = validateUsername(username);
    if (usernameError) {
      ctx.addIssue({
        code: "custom",
        path: ["username"],
        message: usernameError,
      });
    }

    if (value.dayStart >= value.dayEnd) {
      ctx.addIssue({
        code: "custom",
        path: ["dayEnd"],
        message: "Closing time must be after opening time.",
      });
    }

    if (!DateTime.now().setZone(value.timezone).isValid) {
      ctx.addIssue({
        code: "custom",
        path: ["timezone"],
        message: "Unknown timezone.",
      });
    }

    const open = new Set(value.openDates);
    value.items.forEach((item, index) => {
      const extra = item.dates.filter((date) => !open.has(date));
      if (extra.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "dates"],
          message: "Item dates must be open days on the calendar.",
        });
      }
    });
  });

export const bookInputSchema = z.object({
  username: z.string().min(1),
  itemId: z.string().min(1),
  startsAt: z.string().min(1),
  guestName: z.string().trim().min(1).max(80),
  guestEmail: z.string().min(3).max(120),
  guestPhone: z.string().min(5).max(30),
});
