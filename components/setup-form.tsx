"use client";

import { DateTime } from "luxon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MonthCalendar } from "@/components/month-calendar";
import {
  DEFAULT_DAY_END,
  DEFAULT_DAY_START,
  DEFAULT_TIMEZONE,
  DURATION_PRESETS,
  TIMEZONES,
} from "@/lib/constants";
import { todayIso } from "@/lib/slots";
import type { PublicCalendar } from "@/lib/types";
import { normalizeUsername } from "@/lib/username";

type DraftItem = {
  clientId: string;
  id?: string;
  name: string;
  durationMinutes: number;
  dates: string[];
};

type SetupFormProps = {
  username: string;
  initial: (PublicCalendar & { phone?: string; canEdit?: boolean }) | null;
  editKey: string | null;
  taken: boolean;
};

const STORAGE_PREFIX = "bookme.editKey.";

function loadStoredKey(username: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_PREFIX + username);
}

export function SetupForm({ username, initial, editKey, taken }: SetupFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial?.displayName ?? username);
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone ?? DEFAULT_TIMEZONE);
  const [dayStart, setDayStart] = useState(initial?.dayStart ?? DEFAULT_DAY_START);
  const [dayEnd, setDayEnd] = useState(initial?.dayEnd ?? DEFAULT_DAY_END);
  const [openDates, setOpenDates] = useState<Set<string>>(
    () => new Set(initial?.openDates ?? []),
  );
  const [items, setItems] = useState<DraftItem[]>(() =>
    initial?.items.length
      ? initial.items.map((item) => ({
          clientId: item.id,
          id: item.id,
          name: item.name,
          durationMinutes: item.durationMinutes,
          dates: item.dates,
        }))
      : [
          {
            clientId: crypto.randomUUID(),
            name: "",
            durationMinutes: 60,
            dates: [],
          },
        ],
  );
  const [cursor, setCursor] = useState(() => DateTime.now().startOf("month"));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taken || initial?.canEdit) return;
    const stored = loadStoredKey(username);
    if (stored) {
      router.replace(`/setup/${username}?key=${encodeURIComponent(stored)}`);
    }
  }, [initial?.canEdit, router, taken, username]);

  const canEdit = Boolean(initial?.canEdit || (!initial && !taken));

  const sortedOpen = useMemo(
    () => [...openDates].sort(),
    [openDates],
  );
  const today = todayIso(timezone);

  const paintDates = useCallback((dates: string[], selected: boolean) => {
    setOpenDates((current) => {
      const next = new Set(current);
      for (const date of dates) {
        if (selected) next.add(date);
        else next.delete(date);
      }
      return next;
    });
    if (!selected) {
      setItems((current) =>
        current.map((item) => ({
          ...item,
          dates: item.dates.filter((date) => !dates.includes(date)),
        })),
      );
    }
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      username: normalizeUsername(username),
      displayName: displayName.trim() || username,
      phone,
      timezone,
      dayStart,
      dayEnd,
      openDates: sortedOpen,
      items: items
        .filter((item) => item.name.trim())
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
          durationMinutes: item.durationMinutes,
          dates: item.dates,
        })),
      editKey: editKey ?? loadStoredKey(username) ?? undefined,
    };

    const isUpdate = Boolean(initial);
    const response = await fetch(
      isUpdate ? `/api/calendars/${username}` : "/api/calendars",
      {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = (await response.json()) as {
      error?: string;
      editKey?: string;
      whatsappSent?: boolean;
    };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save.");
      return;
    }
    const nextKey = data.editKey ?? editKey ?? loadStoredKey(username);
    if (nextKey) {
      window.localStorage.setItem(STORAGE_PREFIX + username, nextKey);
      const params = new URLSearchParams({ key: nextKey });
      if (!isUpdate) {
        params.set("wa", data.whatsappSent ? "1" : "0");
      }
      router.push(`/setup/${username}/done?${params.toString()}`);
      return;
    }
    setError("Saved, but the edit key is missing. Keep this tab open and try again.");
  }

  if (taken && !canEdit) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-xl px-5 py-8 sm:py-16">
        <h1 className="break-all font-display text-3xl font-bold sm:text-4xl">
          That URL is taken
        </h1>
        <p className="mt-4 text-lg text-muted">
          /{username} already points to a calendar. Pick another username, or
          open this page with the secret edit link.
        </p>
        <Link className="mt-8 inline-block border-b border-accent text-accent" href="/">
          Choose a different name
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
        Creator setup
      </p>
      <h1
        data-testid="setup-heading"
        className="mt-2 break-all font-display text-3xl font-bold sm:text-4xl"
      >
        /{username}
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">
        White days are open. Gray days with an X are closed. Attach activities
        to open days, then share the URL.
      </p>
      {editKey ? (
        <Link
          href={`/setup/${username}/bookings?key=${encodeURIComponent(editKey)}`}
          className="mt-3 inline-flex min-h-11 items-center text-sm text-accent"
        >
          View bookings
        </Link>
      ) : null}

      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <section className="min-w-0">
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
            mode="setup"
            today={today}
            onPaintDates={paintDates}
          />
          <p className="mt-3 text-sm text-muted">
            Click a day to toggle it. Drag across days to open or close a range.
          </p>
        </section>

        <section className="min-w-0 space-y-6">
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Display name
            </span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 w-full min-w-0 border border-rule bg-open px-3 py-2.5 text-base"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              WhatsApp number
            </span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+44 7911 123456"
              autoComplete="tel"
              className="mt-1 w-full min-w-0 border border-rule bg-open px-3 py-2.5 text-base"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Timezone
            </span>
            <select
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mt-1 w-full min-w-0 border border-rule bg-open px-3 py-2.5 text-base"
            >
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                Opens
              </span>
              <input
                type="time"
                value={dayStart}
                onChange={(event) => setDayStart(event.target.value)}
                className="mt-1 w-full min-w-0 border border-rule bg-open px-2 py-2.5 font-mono text-base sm:px-3"
              />
            </label>
            <label className="block min-w-0">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                Closes
              </span>
              <input
                type="time"
                value={dayEnd}
                onChange={(event) => setDayEnd(event.target.value)}
                className="mt-1 w-full min-w-0 border border-rule bg-open px-2 py-2.5 font-mono text-base sm:px-3"
              />
            </label>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold sm:text-2xl">Items</h2>
              <button
                type="button"
                className="min-h-11 shrink-0 cursor-pointer border border-accent px-3 py-2 text-sm text-accent md:min-h-0 md:py-1"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    {
                      clientId: crypto.randomUUID(),
                      name: "",
                      durationMinutes: 60,
                      dates: [],
                    },
                  ])
                }
              >
                Add item
              </button>
            </div>
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.clientId} className="border border-rule bg-open p-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      aria-label="Item name"
                      placeholder="Dinner"
                      value={item.name}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((row) =>
                            row.clientId === item.clientId
                              ? { ...row, name: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="w-full min-w-0 border border-rule bg-paper px-3 py-2.5 text-base sm:px-2 sm:py-1"
                    />
                    <select
                      aria-label="Duration"
                      value={item.durationMinutes}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((row) =>
                            row.clientId === item.clientId
                              ? { ...row, durationMinutes: Number(event.target.value) }
                              : row,
                          ),
                        )
                      }
                      className="w-full min-w-0 border border-rule bg-paper px-3 py-2.5 font-mono text-base sm:w-auto sm:px-2 sm:py-1"
                    >
                      {DURATION_PRESETS.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes}m
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                    Dates for this item
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {sortedOpen.length === 0 ? (
                      <p className="text-sm text-muted">Open some days first.</p>
                    ) : (
                      sortedOpen.map((date) => {
                        const active = item.dates.includes(date);
                        const label = DateTime.fromISO(date).toFormat("d LLL");
                        return (
                          <button
                            key={date}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setItems((current) =>
                                current.map((row) => {
                                  if (row.clientId !== item.clientId) return row;
                                  const dates = active
                                    ? row.dates.filter((value) => value !== date)
                                    : [...row.dates, date];
                                  return { ...row, dates };
                                }),
                              )
                            }
                            className={[
                              "min-h-11 cursor-pointer px-3 py-2 font-mono text-xs md:min-h-0 md:px-2 md:py-1",
                              active ? "bg-accent text-accent-ink" : "border border-rule",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      })
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-accent">{error}</p> : null}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="min-h-12 w-full cursor-pointer bg-accent px-4 py-3 font-display text-lg font-semibold text-accent-ink disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save calendar"}
          </button>
        </section>
      </div>
    </main>
  );
}
