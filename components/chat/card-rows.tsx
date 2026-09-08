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
import { SendAltIcon } from "@/components/ui/icons/send-alt";
import { WalletIcon } from "@/components/ui/icons/wallet";
import type {
  BankDetails,
  ChatContact,
  ChatOption,
  ChatPlan,
} from "@/lib/chat";
import {
  answeredAction,
  answeredContact,
  answeredOption,
  answeredPlan,
  contactKey,
  isCustom,
  optionKey,
  planKey,
} from "@/lib/chat-answer";
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
const RESTING = "border-jumpa-primary-100 bg-jumpa-grey-100";
/** A contact row carries no box, so its picked mark is a ring — no layout cost. */
const CONTACT_ROW =
  "flex w-full items-center gap-2 rounded-xl text-left tap active:scale-[0.99]";
const CONTACT_SELECTED =
  "ring-2 ring-jumpa-primary-600 ring-offset-4 ring-offset-jumpa-neutral-95";
/** The same shell stacked — a plan needs the full width on every line. */
const PLAN_ROW =
  "flex w-full flex-col gap-2 rounded-xl border p-3 text-left tap active:scale-[0.99]";

/**
 * One row of a chooser. Picking it answers the agent, so the row sends its
 * `reply` back into the conversation rather than navigating anywhere.
 */
export function OptionRow({
  option,
  selected = option.selected ?? false,
  onSelect,
}: {
  option: ChatOption;
  selected?: boolean;
  onSelect?: (reply: string) => void;
}) {
  const Icon = option.icon
    ? OPTION_ICONS[option.icon as keyof typeof OPTION_ICONS]
    : undefined;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(option.reply ?? option.label)}
      className={cn(ROW, selected ? SELECTED : RESTING)}
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
          <span className="truncate text-[11px] leading-4 text-jumpa-black">
            {option.description}
          </span>
        ) : null}
      </span>

      {/* Capped, or a wide figure squeezes the label down to one letter. */}
      {option.amount ? (
        <span className="max-w-[45%] shrink-0 truncate text-sm leading-5 font-semibold text-jumpa-black">
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
      {/* Send, not a chevron: iOS number pads have no return key to submit with. */}
      <button
        type="submit"
        disabled={!entered}
        aria-label={`Send this ${option.label.toLowerCase()}`}
        className="tap -m-2 shrink-0 p-2 text-jumpa-primary-600 active:scale-90 disabled:text-jumpa-primary-200"
      >
        <SendAltIcon aria-hidden="true" className="size-6" />
      </button>
    </form>
  );
}

/** A chooser's rows, ruled apart only when the design draws them borderless. */
export function OptionList({
  options,
  answer,
  claimed,
  onSelect,
}: {
  options: ChatOption[];
  /** The reply this chooser already got, so a reload lights the row again. */
  answer?: string;
  /** Another row on the same card matched the answer — see answeredOption. */
  claimed?: boolean;
  onSelect?: (reply: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  // Covers the tap itself; once the reply lands, `answer` resolves the same row.
  const [tapped, setTapped] = useState<string | null>(null);
  const picked = tapped ?? answeredOption(options, answer, claimed);
  // Keyboard hint only: if the fixed choices are figures, so is the custom one.
  const numeric = options.some(
    (option) => !isCustom(option) && /^[^0-9A-Za-z]*\d/.test(option.label),
  );

  return (
    <>
      {options.map((option, index) => {
        const key = optionKey(option, index);

        if (isCustom(option) && editing === key) {
          return (
            <CustomField
              key={key}
              option={option}
              numeric={numeric}
              onCancel={() => setEditing(null)}
              onSubmit={(value) => {
                setEditing(null);
                setTapped(key);
                onSelect?.(value);
              }}
            />
          );
        }

        return (
          <OptionRow
            key={key}
            option={option}
            selected={option.selected || picked === key}
            onSelect={
              isCustom(option)
                ? () => setEditing(key)
                : (reply) => {
                    setTapped(key);
                    onSelect?.(reply);
                  }
            }
          />
        );
      })}
    </>
  );
}

/** Kind pill opposite a plan's name, in the savings screens' colours. */
function PlanKind({ label }: { label: string }) {
  return (
    <span className="flex h-5.5 shrink-0 items-center rounded-xl bg-jumpa-primary-300 px-2.5 text-[11px] leading-4 whitespace-nowrap text-jumpa-white">
      {label}
    </span>
  );
}

/**
 * One savings plan, laid out as the savings screens draw it — progress towards
 * a target. Picking it answers the agent, like any other chooser row.
 */
export function PlanRow({
  plan,
  selected = false,
  onSelect,
}: {
  plan: ChatPlan;
  selected?: boolean;
  onSelect?: (reply: string) => void;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(plan.percent ?? 0)));

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(plan.reply ?? plan.name)}
      className={cn(PLAN_ROW, selected ? SELECTED : RESTING)}
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm leading-4 font-semibold text-jumpa-black">
          {plan.name}
        </span>
        {plan.kind ? <PlanKind label={plan.kind} /> : null}
      </span>

      <span className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] leading-4 font-semibold text-jumpa-black">
          {plan.saved}
          {plan.target ? (
            <span className="font-medium text-jumpa-black/50">
              {" / "}
              {plan.target}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-[11px] leading-4 font-semibold text-jumpa-primary-600">
          {percent}%
        </span>
      </span>

      <span className="h-1 w-full overflow-hidden bg-jumpa-primary-200">
        <span
          className="block h-full bg-jumpa-primary-400"
          style={{ width: `${percent}%` }}
        />
      </span>

      {plan.category || plan.term ? (
        <span className="flex items-center gap-2 text-[11px] leading-4 text-jumpa-black/50">
          <span className="min-w-0 flex-1 truncate">{plan.category}</span>
          <span className="shrink-0">{plan.term}</span>
        </span>
      ) : null}
    </button>
  );
}

/** The plans a savings flow offers, in the order the agent sent them. */
export function PlanList({
  plans,
  answer,
  onSelect,
}: {
  plans: ChatPlan[];
  /** The reply this chooser already got, so a reload lights the row again. */
  answer?: string;
  onSelect?: (reply: string) => void;
}) {
  const [tapped, setTapped] = useState<string | null>(null);
  const picked = tapped ?? answeredPlan(plans, answer);

  return (
    <>
      {plans.map((plan, index) => {
        const key = planKey(plan, index);

        return (
          <PlanRow
            key={key}
            plan={plan}
            selected={picked === key}
            onSelect={(reply) => {
              setTapped(key);
              onSelect?.(reply);
            }}
          />
        );
      })}
    </>
  );
}

/** One candidate recipient: avatar tile, name, and a meta line. */
export function ContactRow({
  contact,
  selected = false,
  onSelect,
}: {
  contact: ChatContact;
  selected?: boolean;
  onSelect?: (reply: string) => void;
}) {
  const isUrl =
    typeof contact.avatar === "string" &&
    (contact.avatar.startsWith("/") ||
      contact.avatar.startsWith("http://") ||
      contact.avatar.startsWith("https://") ||
      contact.avatar.startsWith("data:"));

  const Icon =
    !isUrl && contact.avatar && contact.avatar in OPTION_ICONS
      ? OPTION_ICONS[contact.avatar as keyof typeof OPTION_ICONS]
      : null;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(contact.reply ?? contact.name)}
      className={cn(CONTACT_ROW, selected && CONTACT_SELECTED)}
    >
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-surface bg-jumpa-white">
        {isUrl ? (
          <Image
            src={contact.avatar!}
            alt=""
            width={40}
            height={40}
            className="size-full object-cover"
          />
        ) : Icon ? (
          <Icon aria-hidden="true" className="size-6 text-jumpa-primary-600" />
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
  answer,
  onSelect,
}: {
  contacts: ChatContact[];
  /** The reply this chooser already got, so a reload lights the row again. */
  answer?: string;
  onSelect?: (reply: string) => void;
}) {
  const [tapped, setTapped] = useState<string | null>(null);
  const picked = tapped ?? answeredContact(contacts, answer);

  return (
    <>
      {contacts.map((contact, index) => {
        const key = contactKey(contact, index);

        return (
          <div key={key} className="flex w-full flex-col gap-2.5">
            {index > 0 ? <CardRule /> : null}
            <ContactRow
              contact={contact}
              selected={picked === key}
              onSelect={(reply) => {
                setTapped(key);
                onSelect?.(reply);
              }}
            />
          </div>
        );
      })}
    </>
  );
}

const CONFIRM_MS = 2000;

/** The one action on a bank block — Copy, Confirm, Change or View details. */
function ActionPill({
  action,
  value,
  chosen = false,
  onReply,
}: {
  action: NonNullable<BankDetails["action"]>;
  value: string;
  chosen?: boolean;
  onReply?: (reply: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const isCopy = (action.kind ?? "copy") === "copy";
  const lit = copied || chosen;

  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={async () => {
        if (isCopy) setCopied(await copyText(value));
        else onReply?.(action.reply ?? action.label);
      }}
      className={cn(
        "flex h-6 shrink-0 items-center gap-1 rounded-xl px-3 text-[11px] leading-4 tap active:scale-95",
        lit
          ? "bg-jumpa-alt-400 text-jumpa-alt-950"
          : "bg-jumpa-primary-525 text-jumpa-primary-50",
      )}
    >
      {lit ? <CheckIcon aria-hidden="true" className="size-3" /> : null}
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
  answer,
  onReply,
}: {
  details: BankDetails;
  /** The reply this card already got, so a reload lights the pill again. */
  answer?: string;
  onReply?: (reply: string) => void;
}) {
  // Covers the tap itself; once the reply lands, `answer` resolves it too.
  const [tapped, setTapped] = useState(false);
  const chosen = tapped || answeredAction(details, answer);

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2.5 rounded-xl border bg-jumpa-primary-100 p-3",
        chosen ? "border-jumpa-primary-600" : "border-jumpa-secondary-400",
      )}
    >
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
            chosen={chosen}
            onReply={(reply) => {
              setTapped(true);
              onReply?.(reply);
            }}
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
