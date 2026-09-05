"use client";

import { DateTime } from "luxon";
import { useCallback, useMemo, useState } from "react";
import { MonthCalendar } from "@/components/month-calendar";
import { formatRange, todayIso } from "@/lib/slots";
import type { GeneratedSlot } from "@/lib/slots";
import type { PublicCalendar } from "@/lib/types";

type BookingBoardProps = {
  calendar: PublicCalendar;
};

export function BookingBoard({ calendar }: BookingBoardProps) {
  const firstOpen = calendar.openDates.find(
    (date) => date >= todayIso(calendar.timezone),
  );
  const startMonth = DateTime.fromISO(
    firstOpen ?? calendar.openDates[0] ?? DateTime.now().toISODate() ?? "",
  );
  const [cursor, setCursor] = useState(
    (startMonth.isValid ? startMonth : DateTime.now()).startOf("month"),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [slots, setSlots] = useState<GeneratedSlot[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    itemName: string;
    startsAt: string;
    endsAt: string;
    emailSent: boolean;
  } | null>(null);

  const openDates = useMemo(() => new Set(calendar.openDates), [calendar.openDates]);
  const itemsByDate = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const item of calendar.items) {
      for (const date of item.dates) {
        if (!openDates.has(date)) continue;
        const list = map.get(date) ?? [];
        list.push({ id: item.id, name: item.name });
        map.set(date, list);
      }
    }
    return map;
  }, [calendar.items, openDates]);

  const selectedItem = calendar.items.find((item) => item.id === selectedItemId);
  const hasSelection = Boolean(selectedItem && selectedDate);
  const today = todayIso(calendar.timezone);

  const selectItem = useCallback(
    async (date: string, itemId: string) => {
      setSelectedDate(date);
      setSelectedItemId(itemId);
      setStartsAt(null);
      setSlots([]);
      setSlotsError(null);
      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/calendars/${calendar.username}/slots?date=${date}&itemId=${itemId}`,
        );
        const data = (await response.json()) as {
          slots?: GeneratedSlot[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load times.");
        }
        setSlots(data.slots ?? []);
      } catch (error: unknown) {
        setSlots([]);
        setSlotsError(error instanceof Error ? error.message : "Could not load times.");
      } finally {
        setLoadingSlots(false);
      }
    },
    [calendar.username],
  );

  async function book() {
    if (!selectedItemId || !startsAt) return;
    setSubmitting(true);
    setFormError(null);
    const response = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: calendar.username,
        itemId: selectedItemId,
        startsAt,
        guestName,
        guestEmail,
        guestPhone,
      }),
    });
    const data = (await response.json()) as {
      error?: string;
      itemName?: string;
      startsAt?: string;
      endsAt?: string;
      emailSent?: boolean;
    };
    setSubmitting(false);
    if (!response.ok) {
      setFormError(data.error ?? "Could not book that slot.");
      return;
    }
    setConfirmation({
      itemName: data.itemName ?? selectedItem?.name ?? "Item",
      startsAt: data.startsAt ?? startsAt,
      endsAt: data.endsAt ?? startsAt,
      emailSent: Boolean(data.emailSent),
    });
  }

  if (confirmation) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-xl px-5 py-8 sm:py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
          Confirmed
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          You are on the ledger
        </h1>
        <p className="mt-4 text-lg">
          {confirmation.itemName}
          <br />
          {formatRange(
            new Date(confirmation.startsAt),
            new Date(confirmation.endsAt),
            calendar.timezone,
          )}
        </p>
        <p className="mt-4 text-muted">
          {confirmation.emailSent
            ? "Email confirmations are on the way to you and the host, with a calendar invite attached."
            : "This slot is booked. The email may be delayed."}
        </p>
        <button
          type="button"
          className="mt-8 min-h-11 cursor-pointer border-b border-accent text-accent"
          onClick={() => {
            const date = selectedDate;
            const itemId = selectedItemId;
            setConfirmation(null);
            setGuestName("");
            setGuestEmail("");
            setGuestPhone("");
            setStartsAt(null);
            if (date && itemId) {
              void selectItem(date, itemId);
            }
          }}
        >
          Book another slot
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:py-10">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
            Booking page
          </p>
          <h1 className="mt-2 break-words font-display text-3xl font-bold sm:text-4xl">
            {calendar.displayName}
          </h1>
          <p className="mt-2 text-muted">
            Pick a white day, then an item, then a time. Gray days with an X
            are closed. Slots keep a 30-minute buffer.
          </p>
        </div>
        <p className="break-all font-mono text-xs text-muted">/{calendar.username}</p>
      </div>

      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.75fr)]">
        <section className={`min-w-0 ${hasSelection ? "order-2 lg:order-none" : ""}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="min-w-0 font-display text-xl font-semibold sm:text-2xl">
              {cursor.toFormat("LLLL yyyy")}
            </h2>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="min-h-11 cursor-pointer border border-rule px-3 py-2 font-mono text-xs uppercase md:min-h-0 md:py-1"
                onClick={() => setCursor((current) => current.minus({ months: 1 }))}
              >
                Prev
              </button>
              <button
                type="button"
                className="min-h-11 cursor-pointer border border-rule px-3 py-2 font-mono text-xs uppercase md:min-h-0 md:py-1"
                onClick={() => setCursor((current) => current.plus({ months: 1 }))}
              >
                Next
              </button>
            </div>
          </div>
          <MonthCalendar
            year={cursor.year}
            month={cursor.month}
            openDates={openDates}
            mode="book"
            itemsByDate={itemsByDate}
            selectedDate={selectedDate}
            selectedItemId={selectedItemId}
            today={today}
            onSelectItem={selectItem}
          />
        </section>

        <aside
          className={`min-w-0 border border-rule bg-open p-4 sm:p-5 ${hasSelection ? "order-1 lg:order-none" : ""}`}
        >
          {!selectedItem || !selectedDate ? (
            <p className="text-muted">
              Choose an item on a white day to see available times.
            </p>
          ) : (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
                {DateTime.fromISO(selectedDate).toFormat("ccc d LLL")}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">
                {selectedItem.name}
              </h2>
              <p className="font-mono text-sm text-muted">
                {selectedItem.durationMinutes} minutes
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {loadingSlots ? (
                  <p className="col-span-2 text-sm text-muted">Loading times…</p>
                ) : slotsError ? (
                  <p className="col-span-2 text-sm">{slotsError}</p>
                ) : slots.length === 0 ? (
                  <p className="col-span-2 text-sm text-muted">
                    No free times left on this day.
                  </p>
                ) : (
                  slots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      type="button"
                      data-testid={`slot-${slot.label}`}
                      onClick={() => setStartsAt(slot.startsAt)}
                      className={[
                        "min-h-11 cursor-pointer border px-2 py-2 font-mono text-sm",
                        startsAt === slot.startsAt
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-rule hover:border-accent",
                      ].join(" ")}
                    >
                      {slot.label}
                    </button>
                  ))
                )}
              </div>

              {startsAt ? (
                <form
                  className="mt-6 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void book();
                  }}
                >
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                      Name
                    </span>
                    <input
                      required
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      className="mt-1 w-full min-w-0 border border-rule bg-paper px-3 py-2.5 text-base"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                      Email
                    </span>
                    <input
                      required
                      type="email"
                      value={guestEmail}
                      onChange={(event) => setGuestEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full min-w-0 border border-rule bg-paper px-3 py-2.5 text-base"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                      Phone
                    </span>
                    <input
                      required
                      value={guestPhone}
                      onChange={(event) => setGuestPhone(event.target.value)}
                      placeholder="+44 7911 123456"
                      className="mt-1 w-full min-w-0 border border-rule bg-paper px-3 py-2.5 text-base"
                    />
                  </label>
                  <p className="text-xs text-muted">
                    We email you and the host. No app signup needed.
                  </p>
                  {formError ? <p className="text-sm text-accent">{formError}</p> : null}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-12 w-full cursor-pointer bg-accent px-4 py-3 font-display text-lg font-semibold text-accent-ink disabled:opacity-60"
                  >
                    {submitting ? "Booking…" : "Book slot"}
                  </button>
                </form>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
