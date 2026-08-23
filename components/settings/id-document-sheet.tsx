import Link from "next/link";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { IdCardIcon } from "@/components/ui/icons/id-card";

const DOCUMENTS = [
  { label: "National ID/ NIN", href: "/kyc" },
  { label: "Passport", href: "/kyc" },
  { label: "Drivers Licence", href: "/kyc" },
];

/** Document picker raised from the KYC Verification row. */
export function IdDocumentSheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet onClose={onClose} pb="pb-4">
      <h2 className="pt-3.75 text-center text-base leading-5 font-semibold text-jumpa-black">
        Verify your ID Document
      </h2>
      <p className="mx-auto mt-1.25 max-w-66 text-center text-xs leading-3.5 text-jumpa-black">
        A quick verification helps us keep your account secure and meet
        regulatory requirements.
      </p>

      <ul className="mt-3.75 flex flex-col gap-2">
        {DOCUMENTS.map((document) => (
          <li key={document.label}>
            <Link
              href={document.href}
              className="flex h-14 items-center justify-between gap-3 rounded-panel border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-4 tap active:scale-[0.99]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <IdCardIcon className="size-6 shrink-0 text-jumpa-primary-600" />
                <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
                  {document.label}
                </span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-jumpa-black" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-1.75 text-center text-xs leading-4 text-jumpa-neutral-350">
        Your informations are protected safely
      </p>

      <Button href="/kyc" variant="gradientSheet" size="lg" className="mt-7.75">
        Continue
      </Button>
    </BottomSheet>
  );
}
