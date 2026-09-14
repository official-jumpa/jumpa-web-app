import Image from "next/image";
import type { VirtualCard as Card } from "@/lib/cards";

/** EMV contact pad. Drawn rather than exported — it is five strokes on a plate. */
function Chip() {
  return (
    <svg
      viewBox="0 0 44 34"
      aria-hidden="true"
      focusable="false"
      className="h-8.5 w-11"
    >
      <rect
        width="44"
        height="34"
        rx="4"
        fill="currentColor"
        fillOpacity="0.66"
      />
      <g stroke="#545367" fill="none">
        <path d="M0 7.5H11.5L16 12V24L11.5 28.5H0" />
        <path d="M44 7.5H32.5L28 12V24L32.5 28.5H44" />
        <path d="M16 17.5H0M28 17.5H44M16 17.5V11.5H28V17.5M16 17.5V23.5H28V17.5" />
        <path d="M22.5 11.5V0M22.5 23.5V34" />
      </g>
    </svg>
  );
}

/** Card face. The gradient is an exported render; everything on top is markup. */
export function VirtualCardFace({ card }: { card: Card }) {
  return (
    <div className="relative isolate aspect-[357/200] w-full overflow-hidden rounded-3xl">
      <Image
        src="/images/cards/card-face.webp"
        alt=""
        fill
        sizes="(max-width: 450px) 100vw, 450px"
        className="-z-10 object-cover"
        priority
      />

      {/* The frame pins the three bands at 9 / 83 / 160 inside a 200px face. */}
      <div className="flex h-full flex-col px-7 pt-2.25 pb-5.5">
        <div className="flex items-start justify-between">
          <Image
            src="/logo/wordmark/white.png"
            alt="Jumpa"
            width={384}
            height={80}
            className="mt-3.5 h-3.5 w-17"
          />
          <Image
            src="/images/cards/visa.png"
            alt="Visa"
            width={512}
            height={166}
            className="w-10.5"
          />
        </div>

        <span className="mt-8 text-jumpa-white">
          <Chip />
        </span>

        <div className="mt-auto flex items-center justify-between text-jumpa-white/90">
          <span className="text-base leading-4.5 font-medium">
            **** {card.last4}
          </span>
          <span className="text-xs leading-3.5 font-medium">{card.holder}</span>
        </div>
      </div>
    </div>
  );
}
