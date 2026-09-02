"use client";

import * as Primitive from "@radix-ui/react-select";
import Image from "next/image";
import type { ReactNode } from "react";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
import { CheckIcon } from "@/components/ui/icons/check";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  /** Second line under the label — a currency code, a chain name. */
  caption?: string;
  /** Token or chain logo; pass a real asset path, never a stand-in. */
  icon?: string;
};

/** The design draws two triggers: a full-width field and a compact asset pill. */
const TRIGGER = {
  field:
    "h-12 w-full gap-2 rounded-pill bg-jumpa-primary-50 px-4 text-sm leading-4.5 font-medium text-jumpa-primary-950",
  pill: "h-7 gap-2 rounded-pill bg-jumpa-secondary-100 px-3 text-[10px] leading-5 font-medium text-jumpa-primary-950",
} as const;

const LOGO = { field: 20, pill: 14 } as const;

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  label,
  icon,
  variant = "field",
  invalid,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Accessible name — the visible caption lives outside the trigger. */
  label: string;
  /** Leading glyph for the field trigger, e.g. a globe on "Select country". */
  icon?: ReactNode;
  variant?: keyof typeof TRIGGER;
  /** Flags the trigger after a failed submit. */
  invalid?: boolean;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value);
  const size = LOGO[variant];

  return (
    <Primitive.Root value={value} onValueChange={onValueChange}>
      <Primitive.Trigger
        aria-label={label}
        aria-invalid={invalid}
        className={cn(
          invalid && "ring-1 ring-jumpa-danger",
          "tap flex shrink-0 items-center outline-none active:scale-[0.98] data-[state=open]:ring-1 data-[state=open]:ring-jumpa-primary-600",
          TRIGGER[variant],
          className,
        )}
      >
        {selected?.icon ? (
          <Image
            src={selected.icon}
            alt=""
            width={size}
            height={size}
            className="shrink-0 rounded-full object-contain"
            style={{ width: size, height: size }}
          />
        ) : (
          icon
        )}

        <Primitive.Value placeholder={placeholder} />
        <Primitive.Icon className="ml-auto flex shrink-0">
          <CaretDownIcon aria-hidden="true" className="size-3" />
        </Primitive.Icon>
      </Primitive.Trigger>

      <Primitive.Portal>
        <Primitive.Content
          position="popper"
          sideOffset={6}
          className="z-70 max-h-72 w-[var(--radix-select-trigger-width)] min-w-40 animate-drop-in overflow-hidden rounded-surface border border-jumpa-neutral-100 bg-jumpa-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
        >
          <Primitive.Viewport className="p-1.5">
            {options.map((option) => (
              <Primitive.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-tile px-3 py-2.5 text-sm leading-4.5 font-medium text-jumpa-black outline-none select-none data-[highlighted]:bg-jumpa-primary-50 data-[state=checked]:bg-jumpa-primary-50"
              >
                {option.icon ? (
                  <Image
                    src={option.icon}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 shrink-0 rounded-full object-contain"
                  />
                ) : null}

                <span className="flex min-w-0 flex-col">
                  <Primitive.ItemText>{option.label}</Primitive.ItemText>
                  {option.caption ? (
                    <span className="truncate text-[10px] leading-3 font-normal text-jumpa-neutral-400">
                      {option.caption}
                    </span>
                  ) : null}
                </span>

                <Primitive.ItemIndicator className="ml-auto flex text-jumpa-primary-600">
                  <CheckIcon aria-hidden="true" className="size-4" />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
