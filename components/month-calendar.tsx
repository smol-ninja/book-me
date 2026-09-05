"use client";

import { DateTime } from "luxon";
import { memo, useCallback, useMemo, useRef } from "react";
import { isoDateRange } from "@/lib/slots";

export type CalendarChip = {
  id: string;
  name: string;
};

type MonthCalendarProps = {
  year: number;
  month: number;
  openDates: Set<string>;
  mode: "setup" | "book";
  itemsByDate?: Map<string, CalendarChip[]>;
  selectedDate?: string | null;
  selectedItemId?: string | null;
  today?: string | null;
  onPaintDates?: (dates: string[], selected: boolean) => void;
  onSelectItem?: (date: string, itemId: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CELL_MIN_HEIGHT = "min-h-11 min-w-0 md:min-h-[7.5rem]";
const EMPTY_CHIPS: CalendarChip[] = [];

function monthCells(year: number, month: number) {
  const first = DateTime.local(year, month, 1);
  const leading = first.weekday - 1;
  const days = first.daysInMonth ?? 30;
  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) {
    const iso = DateTime.local(year, month, day).toISODate();
    if (iso) cells.push({ iso, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function ClosedMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0 text-closed-ink md:h-5 md:w-5"
      aria-hidden="true"
    >
      <path
        d="M3.5 3.5l9 9m0-9l-9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

type DayCellProps = {
  iso: string;
  day: number;
  open: boolean;
  selected: boolean;
  today: boolean;
  mode: "setup" | "book";
  chips: CalendarChip[];
  selectedItemId?: string | null;
  onPaintStart?: (iso: string, currentlyOpen: boolean, target: HTMLElement, pointerId: number) => void;
  onPaintEnter?: (iso: string) => void;
  onPaintEnd?: () => void;
  onSelectItem?: (date: string, itemId: string) => void;
};

const DayCell = memo(function DayCell({
  iso,
  day,
  open,
  selected,
  today,
  mode,
  chips,
  selectedItemId,
  onPaintStart,
  onPaintEnter,
  onPaintEnd,
  onSelectItem,
}: DayCellProps) {
  const interactiveBook = mode === "book" && open && chips.length > 0;
  const DayTag = mode === "setup" ? "button" : "div";
  const label = [
    DateTime.fromISO(iso).toFormat("cccc d LLLL yyyy"),
    open ? "open" : "unavailable",
    today ? "today" : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <DayTag
      type={mode === "setup" ? "button" : undefined}
      data-date={iso}
      data-open={open ? "true" : "false"}
      data-testid={`day-${iso}`}
      aria-label={label}
      aria-pressed={mode === "setup" ? open : undefined}
      className={[
        CELL_MIN_HEIGHT,
        "p-1 text-left md:p-1.5",
        open ? "bg-open text-open-ink" : "bg-closed text-closed-ink",
        selected ? "ring-2 ring-inset ring-brass" : "",
        mode === "setup" ? "cursor-pointer" : "",
      ].join(" ")}
      onPointerDown={(event) => {
        if (mode !== "setup") return;
        onPaintStart?.(iso, open, event.currentTarget, event.pointerId);
      }}
      onPointerEnter={() => {
        if (mode !== "setup") return;
        onPaintEnter?.(iso);
      }}
      onPointerUp={() => {
        onPaintEnd?.();
      }}
    >
      <div className="flex items-start justify-between gap-0.5">
        <div
          className={[
            "font-mono text-[10px] md:text-xs",
            today ? "text-brass" : "",
          ].join(" ")}
        >
          {String(day).padStart(2, "0")}
        </div>
        {open ? null : <ClosedMark />}
      </div>
      {mode === "book" && chips.length > 0 ? (
        <div className="mt-1 flex flex-col gap-1">
          {chips.map((chip) => {
            const active = selected && selectedItemId === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                disabled={!interactiveBook}
                data-testid={`chip-${iso}-${chip.name}`}
                onClick={() => onSelectItem?.(iso, chip.id)}
                className={[
                  "flex min-h-11 w-full min-w-0 cursor-pointer items-center overflow-hidden rounded-sm px-0.5 text-left font-display text-[10px] font-semibold leading-tight tracking-normal md:min-h-0 md:px-1.5 md:py-0.5 md:text-[11px] md:tracking-wide",
                  active
                    ? "bg-accent text-accent-ink"
                    : "border border-accent/30 bg-chip text-ink hover:border-accent",
                  !interactiveBook ? "opacity-50" : "",
                ].join(" ")}
              >
                <span className="min-w-0 break-all md:truncate">{chip.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </DayTag>
  );
});

export const MonthCalendar = memo(function MonthCalendar({
  year,
  month,
  openDates,
  mode,
  itemsByDate,
  selectedDate,
  selectedItemId,
  today,
  onPaintDates,
  onSelectItem,
}: MonthCalendarProps) {
  const drag = useRef<{ origin: string; selecting: boolean } | null>(null);
  const cells = useMemo(() => monthCells(year, month), [year, month]);

  const onPaintStart = useCallback(
    (iso: string, currentlyOpen: boolean, target: HTMLElement, pointerId: number) => {
      if (pointerId !== 0) {
        try {
          target.setPointerCapture(pointerId);
        } catch {
          // Synthetic events may not support capture.
        }
      }
      const selecting = !currentlyOpen;
      drag.current = { origin: iso, selecting };
      onPaintDates?.(isoDateRange(iso, iso), selecting);
    },
    [onPaintDates],
  );

  const onPaintEnter = useCallback(
    (iso: string) => {
      if (!drag.current) return;
      onPaintDates?.(isoDateRange(drag.current.origin, iso), drag.current.selecting);
    },
    [onPaintDates],
  );

  const onPaintEnd = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div className="w-full min-w-0 max-w-full select-none">
      <div className="mb-2 grid grid-cols-7 gap-px font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.18em]">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-0.5 py-1 text-center sm:px-1">
            <span className="sm:hidden">{day.slice(0, 1)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>
      <div className="grid w-full min-w-0 grid-cols-7 gap-px border border-rule bg-rule">
        {cells.map((cell, index) => {
          if (!cell) {
            return (
              <div
                key={`empty-${index}`}
                className={`${CELL_MIN_HEIGHT} bg-paper/70`}
              />
            );
          }

          return (
            <DayCell
              key={cell.iso}
              iso={cell.iso}
              day={cell.day}
              open={openDates.has(cell.iso)}
              selected={selectedDate === cell.iso}
              today={today === cell.iso}
              mode={mode}
              chips={itemsByDate?.get(cell.iso) ?? EMPTY_CHIPS}
              selectedItemId={selectedItemId}
              onPaintStart={mode === "setup" ? onPaintStart : undefined}
              onPaintEnter={mode === "setup" ? onPaintEnter : undefined}
              onPaintEnd={mode === "setup" ? onPaintEnd : undefined}
              onSelectItem={mode === "book" ? onSelectItem : undefined}
            />
          );
        })}
      </div>
    </div>
  );
});
