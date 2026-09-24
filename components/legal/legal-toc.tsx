import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import type { LegalSection } from "@/lib/legal";
import { sectionSlug } from "@/lib/legal";

const LINK =
  "block rounded-lg px-3 py-1.5 text-[13px] leading-4.5 text-jumpa-neutral-700 " +
  "transition-colors hover:bg-jumpa-primary-50 hover:text-jumpa-primary-950";

/**
 * Both documents run past twenty sections, so a reader needs a way in. Rendered
 * twice from the same list: a disclosure above the text on a phone, and a
 * sticky rail beside it on a laptop. `<details>` keeps this a Server Component.
 */
export function LegalToc({ sections }: { sections: readonly LegalSection[] }) {
  const items = sections.map((section, index) => (
    <li key={section.heading}>
      {/* A plain anchor, not `next/link`: native hash navigation is what
          honours `scroll-mt` on the target, and there is no route to change. */}
      <a href={`#${sectionSlug(section.heading)}`} className={LINK}>
        <span className="mr-1.5 tabular-nums text-jumpa-neutral-350">
          {index + 1}
        </span>
        {section.heading}
      </a>
    </li>
  ));

  return (
    <>
      <details className="group rounded-surface border border-jumpa-neutral-100 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm leading-5 font-semibold text-jumpa-black">
          Jump to a section
          <ChevronDownIcon className="size-4.5 text-jumpa-neutral-350 transition-transform group-open:-rotate-180" />
        </summary>
        <ul className="flex flex-col gap-0.5 px-1.5 pb-2">{items}</ul>
      </details>

      {/* The header is 65px of sticky chrome; the rail clears it and scrolls
          on its own once the list is taller than what is left. */}
      <nav
        aria-label="On this page"
        className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto lg:block"
      >
        <p className="px-3 pb-2 text-[11px] leading-4 font-semibold tracking-wide text-jumpa-neutral-350 uppercase">
          On this page
        </p>
        <ul className="flex flex-col gap-0.5">{items}</ul>
      </nav>
    </>
  );
}
