import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { MailIcon } from "@/components/ui/icons/mail";
import { MessageCircleQuestionIcon } from "@/components/ui/icons/message-circle-question";
import { MessageSquareChatIcon } from "@/components/ui/icons/message-square-chat";
import { supportHref, supportMailto } from "@/lib/support";

export type SupportOptionId = "chat" | "email" | "faqs";

interface SupportOption {
  id: SupportOptionId;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  href: string;
  /** Leaves the app — the mail client, not a route. */
  external?: true;
}

/** The three ways to reach support. Order and copy come from the design. */
export const SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: "chat",
    Icon: MessageSquareChatIcon,
    title: "Live Chat",
    href: supportHref("chat"),
  },
  {
    id: "email",
    Icon: MailIcon,
    title: "Email Us",
    href: supportMailto(),
    external: true,
  },
  {
    id: "faqs",
    Icon: MessageCircleQuestionIcon,
    title: "FAQs",
    href: supportHref("faqs"),
  },
];

/** Row shell, shared so the sheet and the screen cannot drift. */
const ROW =
  "tap flex w-full items-center justify-between gap-2 rounded-lg bg-jumpa-neutral-50 px-3 py-4 active:scale-[0.99]";

function SupportOptionBody({ option }: { option: SupportOption }) {
  const { Icon, title } = option;

  return (
    <>
      <span className="flex items-center gap-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[22px] bg-jumpa-primary-600 text-jumpa-white">
          <Icon className="size-6" />
        </span>
        <span className="text-sm leading-4 font-medium text-jumpa-black">
          {title}
        </span>
      </span>
      <ChevronRightIcon className="size-6 shrink-0 text-jumpa-black" />
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
