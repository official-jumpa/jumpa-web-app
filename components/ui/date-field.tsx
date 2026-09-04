"use client";

import { useState } from "react";
import { DayPicker, type Matcher } from "react-day-picker";
import { CalendarIcon } from "@/components/ui/icons/calendar";
import { SheetPortal } from "@/components/ui/sheet-portal";

/** Explicit h-11.5 — the design's stroke is inside, a CSS border is outside. */
const TRIGGER =
  "flex h-11.5 w-full items-center justify-between gap-2 rounded-surface border bg-jumpa-white px-3 text-left text-xs leading-4 font-medium outline-none";

/** `YYYY-MM-DD` parsed as local time — `new Date(iso)` would read it as UTC. */
function toDate(iso: string): Date | undefined {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

/** `2026/09/27` — how the design prints a date outside an input. */
function display(iso: string): string {
  return iso.replace(/-/g, "/");
}

function toIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const CALENDAR = {
  root: "w-full text-jumpa-black",
  months: "flex w-full flex-col",
  month: "w-full",
  month_caption: "flex h-10 items-center justify-center",
  caption_label: "text-sm font-semibold",
  nav: "absolute inset-x-0 top-0 flex h-10 items-center justify-between",
  button_previous:
    "tap flex size-9 items-center justify-center rounded-full text-jumpa-primary-600 active:scale-95 disabled:opacity-30",
  button_next:
    "tap flex size-9 items-center justify-center rounded-full text-jumpa-primary-600 active:scale-95 disabled:opacity-30",
  chevron: "size-4 fill-current",
  month_grid: "w-full border-collapse",
  weekdays: "flex w-full",
  weekday:
    "flex-1 pb-2 text-[10px] leading-4 font-medium text-jumpa-neutral-300 uppercase",
  week: "flex w-full",
  day: "flex flex-1 justify-center py-0.5",
  day_button:
    "tap flex size-9 items-center justify-center rounded-full text-xs font-medium active:scale-95",
  selected: "[&_button]:bg-jumpa-primary-600 [&_button]:text-jumpa-white",
  today: "[&_button]:font-bold [&_button]:text-jumpa-primary-600",
  outside: "[&_button]:text-jumpa-neutral-300",
  disabled: "[&_button]:pointer-events-none [&_button]:opacity-30",
};

/**
 * Date picker on the app's own calendar rather than the browser's native one,
 * which each platform draws differently. The value stays `YYYY-MM-DD`, so it
 * drops in wherever an `<input type="date">` was.
 */
export function DateField({
  label,
  value,
  invalid,
  placeholder = "Select a date",
  min,
  max,
  className,
  onChange,
}: {
  label: string;
  value: string;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  /** `YYYY-MM-DD` bounds. Days outside them are shown but not selectable. */
  min?: string;
  max?: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);

  const bounds: Matcher[] = [];
  const first = toDate(min ?? "");
  const last = toDate(max ?? "");
  if (first) bounds.push({ before: first });
  if (last) bounds.push({ after: last });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-invalid={invalid}
        className={`${TRIGGER} ${
          invalid ? "border-jumpa-danger" : "border-jumpa-grey-100"
        } ${value ? "text-jumpa-primary-950" : "text-jumpa-secondary-200"} ${className ?? ""}`}
      >
        {value ? display(value) : placeholder}
        <CalendarIcon className="size-4.5 shrink-0 text-jumpa-primary-600" />
      </button>

      {open ? (
        <SheetPortal onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4 pb-1">
            <h2 className="text-base font-medium text-jumpa-black">{label}</h2>
            <div className="relative rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-3 py-2">
              <DayPicker
                mode="single"
                selected={selected}
                defaultMonth={selected}
                disabled={bounds}
                showOutsideDays
                classNames={CALENDAR}
                onSelect={(next) => {
                  if (!next) return;
                  onChange(toIso(next));
                  setOpen(false);
                }}
              />
            </div>
          </div>
        </SheetPortal>
      ) : null}
    </>
  );
}
