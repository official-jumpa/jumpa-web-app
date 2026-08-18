import Image from "next/image";

/** Blurred ellipses from the 393x852 artboard. `wide` is the larger blur used on slide 2. */
export function GlowBackdrop({
  spread = "default",
}: {
  spread?: "default" | "wide";
}) {
  const suffix = spread === "wide" ? "-wide" : "";
  const inset = spread === "wide" ? "-21.35% -197.45%" : "-14.95% -138.21%";
  const centerInset = spread === "wide" ? "-17.33% -200%" : "-12.13% -140%";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute top-0 left-1/2 h-full w-[393px] -translate-x-1/2">
        <div className="absolute top-[-505px] left-[-115px] flex h-[953px] w-[204px] items-center justify-center">
          <div className="flex-none -scale-y-[0.99] rotate-[167.07deg] skew-x-[-6.46deg]">
            <div className="relative h-[937px] w-[101px]">
              <div className="absolute" style={{ inset }}>
                <Image
                  src={`/images/onboarding/glow-left${suffix}.svg`}
                  alt=""
                  fill
                  sizes="400px"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-[-505px] left-[calc(25%+48.75px)] h-[1154px] w-[100px]">
          <div className="absolute" style={{ inset: centerInset }}>
            <Image
              src={`/images/onboarding/glow-center${suffix}.svg`}
              alt=""
              fill
              sizes="400px"
            />
          </div>
        </div>

        <div className="absolute top-[-505px] left-[calc(75%+10.44px)] flex h-[953px] w-[204px] items-center justify-center">
          <div className="flex-none rotate-[12.93deg] skew-x-[6.46deg] scale-y-[0.99]">
            <div className="relative h-[937px] w-[101px]">
              <div className="absolute" style={{ inset }}>
                <Image
                  src={`/images/onboarding/glow-right${suffix}.svg`}
                  alt=""
                  fill
                  sizes="400px"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
