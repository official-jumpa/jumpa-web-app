import { Art } from "@/components/landing/art";
import { cn } from "@/lib/cn";
import { SECURITY } from "@/lib/landing";

const SLOTS = 4;

/** The PIN prompt and padlock on the "approve" card, at its 267-wide desktop size. */
export function PinPreview({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative w-267", className)}>
      <div className="flex flex-col items-center gap-19.75">
        <p className="font-semibold text-jumpa-black text-u-13/14.75">
          {SECURITY.pinLabel}
        </p>
        <div className="flex h-82 w-full items-center justify-center gap-16.5 rounded-u-19.75 border-u-0.75 border-jumpa-neutral-275/10 bg-jumpa-white shadow-landing-pin">
          {Array.from({ length: SLOTS }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed, identical slots.
            <span key={i} className="flex h-32.75 items-end">
              <span className="flex w-39.25 flex-col items-center gap-11.5">
                <span className="font-numeric text-jumpa-black text-u-29.5/0">
                  *
                </span>
                <Art
                  src="/images/landing/pin-line.svg"
                  className="-mt-3.25 h-3.25 w-39.25"
                />
              </span>
            </span>
          ))}
        </div>
      </div>
      <Art
        src="/images/landing/padlock.svg"
        className="absolute top-136 left-220 h-72 w-47"
      />
    </div>
  );
}
