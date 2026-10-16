import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { MailIcon } from "@/components/ui/icons/mail";
import { MessageCircleDotsIcon } from "@/components/ui/icons/message-circle-dots";
import { MessageCircleQuestionIcon } from "@/components/ui/icons/message-circle-question";
import { MessageSquareChatIcon } from "@/components/ui/icons/message-square-chat";
import { SUPPORT_EMAIL, supportHref, supportMailto } from "@/lib/support";

export type SupportOptionId = "chat" | "messages" | "email" | "faqs";

interface SupportOption {
  id: SupportOptionId;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  /** One line under the title saying what the row does. */
  caption: string;
  href: string;
  /** Leaves the app — the mail client, not a route. */
  external?: true;
}

/** The ways to reach support. Order and copy come from the design, plus Your messages. */
export const SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: "chat",
    Icon: MessageSquareChatIcon,
    title: "Live Chat",
    caption: "Get an answer now",
    href: supportHref("chat"),
  },
  // Not on the design: the way back into an earlier conversation.
  {
    id: "messages",
    Icon: MessageCircleDotsIcon,
    title: "Your messages",
    caption: "Pick up an earlier conversation",
    href: supportHref("messages"),
  },
  {
    id: "email",
    Icon: MailIcon,
    title: "Email Us",
    caption: SUPPORT_EMAIL,
    href: supportMailto(),
    external: true,
  },
  {
    id: "faqs",
    Icon: MessageCircleQuestionIcon,
    title: "FAQs",
    caption: "Quick answers to common questions",
    href: supportHref("faqs"),
  },
];

/** Row shell, shared so the sheet and the screen cannot drift. */
const ROW =
  "tap flex w-full items-center justify-between gap-2 rounded-lg bg-jumpa-neutral-50 px-3 py-4 active:scale-[0.99]";

function SupportOptionBody({ option }: { option: SupportOption }) {
  const { Icon, title, caption } = option;

  return (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-white">
          <Icon className="size-6" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm leading-4 font-semibold text-jumpa-black">
            {title}
          </span>
          <span className="truncate text-xs leading-4 text-jumpa-neutral-500">
            {caption}
          </span>
        </span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-jumpa-neutral-300" />
    </>
  );
}

/** The chooser itself. `mailto:` needs a real anchor, so Email Us is not a Link. */
export function SupportOptionList() {
  return (
    <ul className="flex w-full flex-col gap-2">
      {SUPPORT_OPTIONS.map((option) => (
        <li key={option.id}>
          {option.external ? (
            <a href={option.href} className={ROW}>
              <SupportOptionBody option={option} />
            </a>
          ) : (
            <Link prefetch href={option.href} className={ROW}>
              <SupportOptionBody option={option} />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
