import Image from "next/image";

/**
 * Grid and glows behind the balance. Offsets are design coordinates in a centred
 * 393px artboard, so they stay put as the band widens.
 */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-y-0 left-1/2 w-[393px] -translate-x-1/2">
        <Image
          src="/images/home/hero-glow-left.svg"
          alt=""
          width={607}
          height={613}
          className="absolute -top-71.75 -left-68.5 max-w-none"
        />
        <Image
          src="/images/home/hero-glow-right.svg"
          alt=""
          width={607}
          height={601}
          className="absolute -top-71.75 left-15 max-w-none"
        />
        <Image
          src="/images/home/hero-grid.svg"
          alt=""
          width={287}
          height={264}
          className="absolute -top-4.75 left-13.25 max-w-none"
        />
      </div>
    </div>
  );
}
