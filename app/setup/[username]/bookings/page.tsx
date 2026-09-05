import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCreatorBookings,
  groupBookingsByDate,
} from "@/lib/booking-service";
import { formatPhoneDisplay } from "@/lib/phone";
import { normalizeUsername, validateUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

export default async function BookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { username: raw } = await params;
  const { key } = await searchParams;
  const username = normalizeUsername(raw);
  if (validateUsername(username)) notFound();

  const result = await getCreatorBookings(username, key);
  if (result.status === "missing") notFound();
  if (result.status === "forbidden") {
    return (
      <main className="mx-auto w-full min-w-0 max-w-xl px-5 py-8 sm:py-16">
        <h1
          data-testid="bookings-denied"
          className="font-display text-3xl font-bold sm:text-4xl"
        >
          This page is private
        </h1>
        <p className="mt-4 text-lg text-muted">
          Open it from your secret edit link. Guests cannot see bookings.
        </p>
        <Link
          href={`/${username}`}
          className="mt-8 inline-block min-h-11 border-b border-accent py-2 text-accent"
        >
          Open booking page
        </Link>
      </main>
    );
  }

  const groups = groupBookingsByDate(
    result.bookings,
    result.calendar.timezone,
  );
  const setupHref = `/setup/${username}?key=${encodeURIComponent(key ?? "")}`;

  return (
    <main className="mx-auto w-full min-w-0 max-w-xl px-5 py-8 sm:py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
        Your bookings
      </p>
      <h1
        data-testid="bookings-heading"
        className="mt-2 break-all font-display text-3xl font-bold sm:text-4xl"
      >
        /{result.calendar.username}
      </h1>
      <p className="mt-2 text-muted">{result.calendar.displayName}</p>
      <p className="text-muted">Times are in {result.calendar.timezone}.</p>
      <Link
        href={setupHref}
        className="mt-3 inline-flex min-h-11 items-center text-sm text-accent"
      >
        Back to setup
      </Link>

      {groups.length === 0 ? (
        <p className="mt-8 text-muted">No bookings yet.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section
              key={group.date}
              data-testid={`booking-date-${group.date}`}
              className="border-t border-rule pt-5"
            >
              <h2 className="font-display text-xl font-semibold sm:text-2xl">
                {group.label}
              </h2>
              <ul className="mt-3 divide-y divide-rule">
                {group.bookings.map((booking) => (
                  <li key={booking.id} className="py-3">
                    <p className="font-mono text-sm">
                      {booking.timeRange}
                      <span className="ml-2 text-[11px] uppercase tracking-[0.14em] text-muted">
                        {booking.upcoming ? "Upcoming" : "Past"}
                      </span>
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold">
                      {booking.itemName}
                    </p>
                    <p className="mt-1 break-words">{booking.guestName}</p>
                    <p className="break-all font-mono text-sm text-muted">
                      {formatPhoneDisplay(booking.guestPhone)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
