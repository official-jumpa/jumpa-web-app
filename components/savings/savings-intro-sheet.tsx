"use client";

import Image from "next/image";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

/** What each product promises, raised over the landing before you commit. */
export type SavingsIntro = {
  art: string;
  width: number;
  height: number;
  title: string;
  body: string;
  terms: string[];
  cta: string;
  href: string;
};

export function SavingsIntroSheet({
  intro,
  onClose,
}: {
  intro: SavingsIntro;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} pb="pb-7.5">
      <div className="flex flex-col items-center gap-4 pt-2">
        <Image
          src={intro.art}
          alt=""
          aria-hidden="true"
          width={intro.width}
          height={intro.height}
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl leading-7 font-semibold text-jumpa-black">
            {intro.title}
          </h2>
          <p className="text-xs leading-4.5 text-jumpa-neutral-700">
            {intro.body}
          </p>
        </div>

        <ul className="flex list-disc flex-col gap-2 rounded-surface bg-jumpa-primary-50 py-4 pr-4 pl-8 text-xs leading-4.5 font-medium text-jumpa-black">
          {intro.terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>

        <Button href={intro.href} variant="gradient" size="lg" className="mt-2">
          {intro.cta}
        </Button>
      </div>
    </BottomSheet>
  );
}
