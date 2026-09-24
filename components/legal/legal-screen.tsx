import Image from "next/image";
import Link from "next/link";
import { LegalToc } from "@/components/legal/legal-toc";
import { SupportHeader } from "@/components/support/support-header";
import {
  LEGAL_CONTACT,
  LEGAL_DOCUMENTS,
  LEGAL_ORDER,
  LEGAL_UPDATED,
  type LegalBlock,
  type LegalDoc,
  legalHref,
  otherLegalDoc,
  sectionSlug,
} from "@/lib/legal";

const BODY =
  "text-sm leading-[22px] text-jumpa-neutral-700 md:text-[15px] md:leading-[26px]";

/** `/terms-of-service` and `/privacy`. One renderer over `lib/legal.ts`. */
export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const document = LEGAL_DOCUMENTS[doc];
  const sibling = otherLegalDoc(doc);
  const inbox = doc === "privacy" ? LEGAL_CONTACT.privacy : LEGAL_CONTACT.legal;

  return (
    <div className="mx-auto w-full max-w-app px-4.5 pb-16 md:max-w-[760px] md:px-10 md:pb-24 lg:max-w-[1060px]">
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

      <header className="mt-4 flex flex-col gap-3 border-b border-jumpa-neutral-100 pb-7 md:mt-8 md:pb-9">
        <h1 className="text-[26px] leading-8 font-semibold text-jumpa-black md:text-[34px] md:leading-10">
          {document.title}
        </h1>
        <p className="text-xs leading-4 text-jumpa-neutral-425">
          Last updated {LEGAL_UPDATED} · {document.sections.length} sections
        </p>
        <DocSwitcher active={doc} />
        <p className={`mt-1 ${BODY}`}>{document.intro}</p>
      </header>

      <div className="mt-7 flex flex-col gap-8 lg:mt-10 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start lg:gap-12">
        <LegalToc sections={document.sections} />

        <article className="flex flex-col gap-8 md:gap-10">
          {document.sections.map((section, index) => (
            <section
              key={section.heading}
              id={sectionSlug(section.heading)}
              // Clears the sticky header, so a deep link does not land under it.
              className="flex scroll-mt-24 flex-col gap-3"
            >
              <h2 className="text-base leading-5.5 font-semibold text-jumpa-black md:text-lg md:leading-6">
                <span className="text-jumpa-primary-600">{index + 1}.</span>{" "}
                {section.heading}
              </h2>
              {section.blocks.map((block) => (
                <Block key={blockKey(block)} block={block} />
              ))}
            </section>
          ))}

          <footer className="rounded-surface bg-jumpa-neutral-50 px-5 py-5 md:px-6 md:py-6">
            <p className="text-sm leading-5 font-semibold text-jumpa-black md:text-base">
              Still have a question?
            </p>
            <p className={`mt-1.5 ${BODY}`}>
              Write to{" "}
              <a
                href={`mailto:${inbox}`}
                className="font-medium text-jumpa-primary-600 underline underline-offset-2"
              >
                {inbox}
              </a>{" "}
              and we will come back to you.
            </p>
            <Link
              href={legalHref(sibling)}
              className="tap mt-4 inline-flex h-11 items-center rounded-pill bg-jumpa-white px-4 text-sm leading-4 font-medium text-jumpa-primary-950 inset-ring-1 inset-ring-jumpa-neutral-100 active:scale-[0.98]"
            >
              Read our {LEGAL_DOCUMENTS[sibling].short}
            </Link>
          </footer>
        </article>
      </div>
    </div>
  );
}

const TAB =
  "tap flex h-9 items-center rounded-pill px-4 text-[13px] leading-4 font-medium transition-colors";

/** Both documents are one tap apart, which is how a reader expects them. */
function DocSwitcher({ active }: { active: LegalDoc }) {
  return (
    <nav className="-mx-0.5 mt-1 flex w-fit gap-1 rounded-pill bg-jumpa-neutral-50 p-1">
      {LEGAL_ORDER.map((doc) => (
        <Link
          key={doc}
          href={legalHref(doc)}
          aria-current={doc === active ? "page" : undefined}
          className={
            doc === active
              ? `${TAB} bg-jumpa-primary-600 text-jumpa-white`
              : `${TAB} text-jumpa-neutral-700 hover:text-jumpa-primary-950`
          }
        >
          {LEGAL_DOCUMENTS[doc].short}
        </Link>
      ))}
    </nav>
  );
}

/** Blocks carry no id, so the first line of one keys it within its section. */
function blockKey(block: LegalBlock): string {
  return block.kind === "list" ? block.items[0] : block.text;
}

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === "callout") {
    return (
      <p className="rounded-surface border-l-3 border-jumpa-primary-600 bg-jumpa-primary-50 px-4 py-3.5 text-sm leading-[22px] font-medium text-jumpa-primary-950 md:px-5 md:py-4 md:text-[15px] md:leading-[26px]">
        {block.text}
      </p>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-jumpa-primary-600">
        {block.items.map((item) => (
          <li key={item} className={BODY}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return <p className={BODY}>{block.text}</p>;
}
