import Image from "next/image";
import Link from "next/link";
import { SupportHeader } from "@/components/support/support-header";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { FileIcon } from "@/components/ui/icons/file";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import {
  LEGAL_DOCUMENTS,
  LEGAL_ORDER,
  LEGAL_UPDATED,
  type LegalDoc,
  legalHref,
} from "@/lib/legal";

const ICON = {
  terms: FileIcon,
  privacy: ShieldCheckIcon,
} satisfies Record<LegalDoc, typeof FileIcon>;

/** Bare `/legal`. The footer links straight to a document; this catches a trimmed URL. */
export function LegalIndex() {
  return (
    <div className="mx-auto w-full max-w-app px-4.5 pb-12 md:max-w-[760px] md:px-10 md:pb-20">
      <SupportHeader
        back="/"
        gutter="wide"
        action={
          <Image
            src="/logo/wordmark/purple.png"
            alt="Jumpa"
            width={96}
            height={20}
            className="h-5 w-24 object-contain"
          />
        }
      >
        <p className="text-[13px] leading-4 font-medium text-jumpa-black">
          Legal
        </p>
      </SupportHeader>

      <header className="mt-4 flex flex-col gap-2 md:mt-8">
        <h1 className="text-[26px] leading-8 font-semibold text-jumpa-black md:text-[34px] md:leading-10">
          Legal
        </h1>
        <p className="text-sm leading-[22px] text-jumpa-neutral-700 md:text-[15px] md:leading-[26px]">
          The agreements that cover your use of Jumpa, and what we do with your
          information. Last updated {LEGAL_UPDATED}.
        </p>
      </header>

      {/* Summaries wrap, so these are their own rows rather than `SettingLink`,
          whose two-line variant truncates. */}
      <div className="mt-7 flex flex-col gap-3 md:mt-10">
        {LEGAL_ORDER.map((doc) => {
          const Icon = ICON[doc];
          return (
            <Link
              key={doc}
              href={legalHref(doc)}
              className="tap flex items-center gap-4 rounded-surface border border-jumpa-neutral-100 px-4 py-4 hover:border-jumpa-primary-200 md:px-5 md:py-5 active:scale-[0.99]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-50">
                <Icon className="size-5.5 text-jumpa-primary-600" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm leading-5 font-semibold text-jumpa-black md:text-base">
                  {LEGAL_DOCUMENTS[doc].title}
                </span>
                <span className="text-xs leading-4.5 text-jumpa-neutral-700 md:text-[13px] md:leading-5">
                  {LEGAL_DOCUMENTS[doc].summary}
                </span>
              </span>

              <ChevronRightIcon className="size-5 shrink-0 text-jumpa-neutral-350" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
