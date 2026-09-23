import Image from "next/image";
import { SupportHeader } from "@/components/support/support-header";
import {
  LEGAL_DOCUMENTS,
  LEGAL_UPDATED,
  type LegalBlock,
  type LegalDoc,
} from "@/lib/legal";

const BODY = "text-sm leading-[22px] text-jumpa-neutral-700";

/** `/legal?doc=terms` and `?doc=privacy`. One renderer over `lib/legal.ts`. */
export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const document = LEGAL_DOCUMENTS[doc];

  return (
    <div className="px-4.5 pb-16">
      <SupportHeader
        back="/"
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

      <article className="mt-4 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-[22px] leading-7 font-semibold text-jumpa-black">
            {document.title}
          </h1>
          <p className="text-xs leading-4 text-jumpa-neutral-425">
            Last updated {LEGAL_UPDATED}
          </p>
          <p className={`mt-1 ${BODY}`}>{document.intro}</p>
        </header>

        {document.sections.map((section, index) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="text-base leading-5.5 font-semibold text-jumpa-black">
              <span className="text-jumpa-primary-600">{index + 1}.</span>{" "}
              {section.heading}
            </h2>
            {section.blocks.map((block) => (
              <Block key={blockKey(block)} block={block} />
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

/** Blocks carry no id, so the first line of one keys it within its section. */
function blockKey(block: LegalBlock): string {
  return block.kind === "list" ? block.items[0] : block.text;
}

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === "callout") {
    return (
      <p className="rounded-surface bg-jumpa-primary-50 px-4 py-3.5 text-sm leading-[22px] font-medium text-jumpa-primary-950">
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
