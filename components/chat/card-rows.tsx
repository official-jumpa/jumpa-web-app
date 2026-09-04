"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CardRule } from "@/components/chat/chat-card";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { BankIcon } from "@/components/ui/icons/bank";
import { CheckIcon } from "@/components/ui/icons/check";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { CoinFrontIcon } from "@/components/ui/icons/coin-front";
import { MoneybagIcon } from "@/components/ui/icons/moneybag";
import { WalletIcon } from "@/components/ui/icons/wallet";
import type { BankDetails, ChatContact, ChatOption } from "@/lib/chat";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

/** Glyphs a chooser row can name. Anything unknown simply renders no icon. */
const OPTION_ICONS = {
  savings: BadgePercentIcon,
  balance: CoinFrontIcon,
  bank: BankIcon,
  wallet: WalletIcon,
  crypto: CoinFrontIcon,
  moneybag: MoneybagIcon,
} as const;

const BOX = "flex w-full items-center gap-2 rounded-xl border p-3 text-left";
const ROW = `${BOX} tap active:scale-[0.99]`;
const SELECTED = "border-jumpa-primary-600 bg-jumpa-primary-100";

/**
 * A "Custom" row asks for a value instead of answering with its own label. The
 * label check is a fallback for a card that omits the flag — the designer's own
 * copy is "Custom" / "Custom Amount".
 */
function isCustom(option: ChatOption) {
  return option.custom ?? /^custom\b/i.test(option.label);
}

/**
 * One row of a chooser. Picking it answers the agent, so the row sends its
 * `reply` back into the conversation rather than navigating anywhere.
 */
export function OptionRow({
  option,
  onSelect,
}: {
  option: ChatOption;
  onSelect?: (reply: string) => void;
}) {
  const Icon = option.icon
    ? OPTION_ICONS[option.icon as keyof typeof OPTION_ICONS]
    : undefined;

  return (
    <button
      type="button"
      aria-pressed={option.selected ?? false}
      onClick={() => onSelect?.(option.reply ?? option.label)}
      className={cn(
        ROW,
        option.selected
          ? SELECTED
          : "border-jumpa-primary-100 bg-jumpa-grey-100",
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className="size-6 shrink-0 text-jumpa-primary-600"
        />
      ) : null}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm leading-4 font-medium text-jumpa-black">
          {option.label}
        </span>
        {option.description ? (
          <span className="text-[11px] leading-4 text-jumpa-black">
            {option.description}
          </span>
        ) : null}
      </span>

      {option.amount ? (
        <span className="shrink-0 text-lg leading-5 font-semibold whitespace-nowrap text-jumpa-black">
          {option.amount}
        </span>
      ) : null}

      <ChevronRightIcon
        aria-hidden="true"
        className="size-6 shrink-0 text-jumpa-black"
      />
    </button>
  );
}

/** The field a Custom row opens: type a value, send it as the reply. */
function CustomField({
  option,
  numeric,
  onCancel,
  onSubmit,
}: {
  option: ChatOption;
  numeric: boolean;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const field = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const entered = value.trim();

  useEffect(() => {
    field.current?.focus();
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (entered) onSubmit(entered);
      }}
      className={cn(BOX, SELECTED)}
    >
      <input
        ref={field}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        inputMode={numeric ? "decimal" : "text"}
        placeholder={option.placeholder ?? option.label}
        aria-label={option.label}
        className="min-w-0 flex-1 bg-transparent text-sm leading-4 font-medium text-jumpa-black outline-none placeholder:text-jumpa-primary-950"
      />
      <button
        type="submit"
        disabled={!entered}
        aria-label={`Use this ${option.label.toLowerCase()}`}
        className="tap shrink-0 text-jumpa-primary-600 active:scale-90 disabled:text-jumpa-primary-200"
      >
        <ChevronRightIcon aria-hidden="true" className="size-6" />
      </button>
    </form>
  );
}

/** A chooser's rows, ruled apart only when the design draws them borderless. */
export function OptionList({
  options,
  onSelect,
}: {
  options: ChatOption[];
  onSelect?: (reply: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  // Keyboard hint only: if the fixed choices are figures, so is the custom one.
  const numeric = options.some(
    (option) => !isCustom(option) && /^[^0-9A-Za-z]*\d/.test(option.label),
  );

  return (
    <>
      {options.map((option, index) => {
        const key = option.id ?? `${option.label}-${index}`;

        if (isCustom(option) && editing === key) {
          return (
            <CustomField
              key={key}
              option={option}
              numeric={numeric}
              onCancel={() => setEditing(null)}
              onSubmit={(value) => {
                setEditing(null);
                onSelect?.(value);
              }}
            />
          );
        }

        return (
          <OptionRow
            key={key}
            option={option}
            onSelect={isCustom(option) ? () => setEditing(key) : onSelect}
          />
        );
      })}
    </>
  );
}

/** One candidate recipient: avatar tile, name, and a meta line. */
export function ContactRow({
  contact,
  onSelect,
}: {
  contact: ChatContact;
  onSelect?: (reply: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(contact.reply ?? contact.name)}
      className="flex w-full items-center gap-2 text-left tap active:scale-[0.99]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-surface bg-jumpa-white">
        {contact.avatar ? (
          <Image
            src={contact.avatar}
            alt=""
            width={40}
            height={40}
            className="size-full object-cover"
          />
        ) : (
          <CircleUserIcon
            aria-hidden="true"
            className="size-6 text-jumpa-primary-600"
          />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm leading-5 font-medium text-jumpa-black">
          {contact.name}
        </span>
        <span className="truncate text-[11px] leading-4 text-jumpa-black/50">
          {contact.meta}
          {contact.metaStrong ? (
            <>
              {"  "}
              <span className="font-bold">{contact.metaStrong}</span>
            </>
          ) : null}
        </span>
      </span>
    </button>
  );
}

/** The contacts, with the design's hairline between each pair. */
export function ContactList({
  contacts,
  onSelect,
}: {
  contacts: ChatContact[];
  onSelect?: (reply: string) => void;
}) {
  return (
    <>
      {contacts.map((contact, index) => (
        <div
          key={contact.id ?? `${contact.name}-${index}`}
          className="flex w-full flex-col gap-2.5"
        >
          {index > 0 ? <CardRule /> : null}
          <ContactRow contact={contact} onSelect={onSelect} />
        </div>
      ))}
    </>
  );
}

const CONFIRM_MS = 2000;

/** The one action on a bank block — Copy, Confirm, Change or View details. */
function ActionPill({
  action,
  value,
  onReply,
}: {
  action: NonNullable<BankDetails["action"]>;
  value: string;
  onReply?: (reply: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const isCopy = (action.kind ?? "copy") === "copy";

  return (
    <button
      type="button"
      onClick={async () => {
        if (isCopy) setCopied(await copyText(value));
        else onReply?.(action.reply ?? action.label);
      }}
      className={cn(
        "flex h-6 shrink-0 items-center gap-1 rounded-xl px-3 text-[11px] leading-4 tap active:scale-95",
        copied
          ? "bg-jumpa-alt-400 text-jumpa-alt-950"
          : "bg-jumpa-primary-525 text-jumpa-primary-50",
      )}
    >
      {copied ? <CheckIcon aria-hidden="true" className="size-3" /> : null}
      {copied ? "Copied" : action.label}
    </button>
  );
}

/**
 * Lavender block carrying the bank the money moves through: label/value lines
 * above the account number and whatever the design asks of it.
 */
export function DetailPanel({
  details,
  onReply,
}: {
  details: BankDetails;
  onReply?: (reply: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-xl border border-jumpa-secondary-400 bg-jumpa-primary-100 p-3">
      {details.lines.map((line) => (
        <div key={line.label} className="flex items-start gap-1">
          <span className="min-w-0 flex-1 text-[11px] leading-4 text-jumpa-black">
            {line.label}
          </span>
          <span className="shrink-0 text-xs leading-4 font-medium text-jumpa-black">
            {line.value}
          </span>
        </div>
      ))}

      <span aria-hidden="true" className="rule-dashed -mb-px h-px w-full" />

      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10px] leading-3 font-bold tracking-wider text-jumpa-black/50 uppercase">
            {details.field.caption}
          </span>
          <span className="truncate text-lg leading-5.5 font-medium text-jumpa-black">
            {details.field.value}
          </span>
        </span>

        {details.action ? (
          <ActionPill
            action={details.action}
            value={details.field.value}
            onReply={onReply}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Wrapper so a card can drop a plain block between two rules. */
export function CardBlock({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col gap-2.5">{children}</div>;
}
