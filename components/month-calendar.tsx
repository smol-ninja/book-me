"use client";

import { DateTime } from "luxon";
import { useRef } from "react";
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
  onPaintDates?: (dates: string[], selected: boolean) => void;
  onSelectItem?: (date: string, itemId: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

export function MonthCalendar({
  year,
  month,
  openDates,
  mode,
  itemsByDate,
  selectedDate,
  selectedItemId,
  onPaintDates,
  onSelectItem,
}: MonthCalendarProps) {
  const drag = useRef<{ origin: string; selecting: boolean } | null>(null);
  const cells = monthCells(year, month);

  function paintRange(from: string, to: string, selecting: boolean) {
    onPaintDates?.(isoDateRange(from, to), selecting);
  }

  return (
    <div className="select-none">
      <div className="mb-2 grid grid-cols-7 gap-px font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 py-1 text-center">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px border border-rule bg-rule">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="min-h-[7.5rem] bg-paper/70" />;
          }

          const open = openDates.has(cell.iso);
          const chips = itemsByDate?.get(cell.iso) ?? [];
          const interactiveBook = mode === "book" && open && chips.length > 0;
          const selected = selectedDate === cell.iso;

          const DayTag = mode === "setup" ? "button" : "div";

          return (
            <DayTag
              key={cell.iso}
              type={mode === "setup" ? "button" : undefined}
              data-date={cell.iso}
              data-testid={`day-${cell.iso}`}
              className={[
                "min-h-[7.5rem] p-1.5 text-left",
                open ? "bg-open text-open-ink" : "bg-closed text-ink",
                selected ? "ring-2 ring-inset ring-brass" : "",
                mode === "setup" ? "cursor-pointer" : "",
              ].join(" ")}
              onPointerDown={(event) => {
                if (mode !== "setup") return;
                if (typeof event.pointerId === "number" && event.pointerId !== 0) {
                  try {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  } catch {
                    // Synthetic events may not support capture.
                  }
                }
                const selecting = !open;
                drag.current = { origin: cell.iso, selecting };
                paintRange(cell.iso, cell.iso, selecting);
              }}
              onPointerEnter={() => {
                if (mode !== "setup" || !drag.current) return;
                paintRange(drag.current.origin, cell.iso, drag.current.selecting);
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            >
              <div className="font-mono text-xs">{String(cell.day).padStart(2, "0")}</div>
              {mode === "book" && (
                <div className="mt-1 flex flex-col gap-1">
                  {chips.map((chip) => {
                    const active = selected && selectedItemId === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        disabled={!interactiveBook}
                        data-testid={`chip-${cell.iso}-${chip.name}`}
                        onClick={() => onSelectItem?.(cell.iso, chip.id)}
                        className={[
                          "truncate rounded-sm px-1.5 py-0.5 text-left font-display text-[11px] font-semibold tracking-wide",
                          active
                            ? "bg-closed text-open"
                            : "bg-white/15 text-open-ink hover:bg-white/25",
                          !interactiveBook ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        {chip.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </DayTag>
          );
        })}
      </div>
    </div>
  );
}
