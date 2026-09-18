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
  /** Quieter second action under the CTA. Only circles draw one. */
  secondary?: { label: string; href: string };
};

export function SavingsIntroSheet({
  intro,
  onClose,
  onContinue,
}: {
  intro: SavingsIntro;
  onClose: () => void;
  onContinue?: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} pb="pb-7.5">
      <div className="flex flex-col items-center gap-6 pt-2">
        <Image
          src={intro.art}
          alt=""
          aria-hidden="true"
          width={intro.width}
          height={intro.height}
        />

        <div className="flex flex-col items-center gap-2.5 text-center">
          <h2 className="text-2xl leading-6.5 font-medium text-jumpa-black">
            {intro.title}
          </h2>
          <p className="max-w-62.5 text-xs leading-3.5 text-jumpa-black">
            {intro.body}
          </p>
        </div>

        <ul className="w-full list-disc rounded-surface bg-jumpa-primary-50 p-4 pl-8.5 text-xs leading-5 font-semibold text-jumpa-black">
          {intro.terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>

        {/* The design stacks the two actions 8px apart. */}
        <div className="flex w-full flex-col gap-2">
          <Button
            href={intro.href}
            variant="gradientSheet"
            size="lg"
            onClick={() => {
              onContinue?.();
              onClose();
            }}
          >
            {intro.cta}
          </Button>

          {intro.secondary ? (
            <Button
              href={intro.secondary.href}
              variant="plain"
              size="lg"
              onClick={onClose}
            >
              {intro.secondary.label}
            </Button>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  );
}
