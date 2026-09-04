import { notFound } from "next/navigation";
import { BookingBoard } from "@/components/booking-board";
import { getCalendarByUsername } from "@/lib/calendar-service";
import { toPublicCalendar } from "@/lib/mappers";
import { normalizeUsername, validateUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

export default async function PublicCalendarPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: raw } = await params;
  const username = normalizeUsername(raw);
  if (validateUsername(username)) notFound();

  const calendar = await getCalendarByUsername(username);
  if (!calendar) notFound();

  return <BookingBoard calendar={toPublicCalendar(calendar)} />;
}
