"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { cn } from "@/lib/cn";

/**
 * Type-to-filter picker. The design draws this as a search field, not a select,
 * so it stays an input the user can type into and the list filters underneath.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder,
  label,
  invalid,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  options: readonly string[];
  placeholder?: string;
  label: string;
  /** Flags the field after a failed submit. */
  invalid?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  const matches = options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const commit = (option: string) => {
    onValueChange(option);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") return setOpen(false);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => {
        const next = index + (event.key === "ArrowDown" ? 1 : -1);
        return (next + matches.length) % Math.max(matches.length, 1);
      });
      return;
    }
    if (event.key === "Enter" && open && matches[active]) {
      event.preventDefault();
      commit(matches[active]);
    }
  };

  return (
    <div ref={box} className={cn("relative", className)}>
      <span
        className={`flex h-11.5 items-center gap-2 rounded-surface border bg-jumpa-white px-3 ${
          invalid ? "border-jumpa-danger" : "border-jumpa-grey-100"
        }`}
      >
        <SearchAltIcon
          aria-hidden="true"
          className="size-5 shrink-0 text-jumpa-primary-600"
        />
        <input
          value={open ? query : value}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid}
          role="combobox"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm leading-4 font-medium text-jumpa-primary-950 outline-none placeholder:text-jumpa-secondary-200"
        />
      </span>

      {open ? (
        <ul
          id={listId}
          className="absolute inset-x-0 top-full z-70 mt-1.5 max-h-56 animate-drop-in overflow-y-auto rounded-surface border border-jumpa-neutral-100 bg-jumpa-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm leading-4.5 text-jumpa-neutral-400">
              No match
            </li>
          ) : (
            matches.map((option, index) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => commit(option)}
                  onPointerEnter={() => setActive(index)}
                  className={cn(
                    "flex w-full items-center rounded-tile px-3 py-2.5 text-left text-sm leading-4.5 font-medium text-jumpa-black",
                    index === active && "bg-jumpa-primary-50",
                  )}
                >
                  {option}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
