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
const CELL_MIN_HEIGHT = "min-h-11 min-w-0 md:min-h-[7.5rem]";

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
                CELL_MIN_HEIGHT,
                "p-1 text-left md:p-1.5",
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
              <div className="font-mono text-[10px] md:text-xs">
                {String(cell.day).padStart(2, "0")}
              </div>
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
                          "flex min-h-11 w-full min-w-0 cursor-pointer items-center overflow-hidden rounded-sm px-0.5 text-left font-display text-[10px] font-semibold leading-tight tracking-normal md:min-h-0 md:px-1.5 md:py-0.5 md:text-[11px] md:tracking-wide",
                          active
                            ? "bg-closed text-open"
                            : "bg-white/15 text-open-ink hover:bg-white/25",
                          !interactiveBook ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <span className="min-w-0 break-all md:truncate">{chip.name}</span>
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
