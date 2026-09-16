import Image from "next/image";
import { DotGlow } from "@/components/landing/dot-glow";
import { HeroEmailForm } from "@/components/landing/email-capture-form";
import { countChars, HeadlineChars } from "@/components/landing/headline-chars";
import { QuickActionChips } from "@/components/landing/quick-action-chips";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import { CirclePlusIcon } from "@/components/ui/icons/circle-plus";
import { GlobeBoldIcon } from "@/components/ui/icons/globe-bold";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";
import { CHAT_PREVIEW, HERO } from "@/lib/landing";

const BUBBLE =
  "rounded-full bg-jumpa-neutral-95 px-26 py-11.5 text-u-13/16 tracking-jumpa text-jumpa-black";

/** Where the heading's own characters stop, so the gradient word follows in step. */
const LEAD_CHARS = countChars(HERO.heading.lead);

/* The column runs on the 70ms `.stagger` step while the heading types itself on
   a 34ms one, so the two are sequenced by hand: the subhead arrives as the last
   character lands, and the form a beat behind it. */
const SUBHEAD_STEP = 15;
const FORM_STEP = 17;

/**
 * The frosted chat mock that floats over the hero photo. Sized in its own 393
 * frame. The frost is the photo pre-blurred and exported rather than a
 * `backdrop-filter`: Figma's background blur reads about twice as strong as the
 * CSS filter at the same number, and neither Figma export renders it at all, so
 * the effect could not be matched or checked in the browser. Baked, it is one
 * image, identical in every browser. Re-run `scratchpad/bake-glass.mjs` to
 * change the radius; it must be re-baked whenever the hero photo changes.
 */
// function ChatPanel() {
//   return (
//     <div className="frame-393 absolute top-1/2 left-200 w-393 -translate-y-1/2">
//       <div className="relative isolate flex h-621 w-393 flex-col justify-end gap-10 overflow-clip rounded-u-42 border-u-2 border-jumpa-primary-50/20 p-10">
//         <Image
//           src="/images/landing/hero-glass-backdrop-mobile.webp"
//           alt=""
//           fill
//           sizes="102px"
//           className="-z-10 object-cover md:hidden"
//         />
//         <Image
//           src="/images/landing/hero-glass-backdrop.webp"
//           alt=""
//           fill
//           sizes="(min-width: 1024px) 393px, 1px"
//           className="-z-10 hidden object-cover md:block"
//         />
//         <span
//           aria-hidden="true"
//           className="absolute inset-0 -z-10 bg-[image:var(--gradient-jumpa-glass)]"
//         />
//         <img
//           src="/images/landing/hero-glow-purple.svg"
//           alt=""
//           aria-hidden="true"
//           className="pointer-events-none absolute -z-10 -left-234.5 top-369 h-771 w-881 max-w-none"
//         />
//         <img
//           src="/images/landing/hero-glow-white.svg"
//           alt=""
//           aria-hidden="true"
//           className="pointer-events-none absolute -z-10 -left-36.5 top-312 h-545 w-445 max-w-none"
//         />

//         <div className="flex w-365 flex-col gap-20 self-start">
//           <div className="flex w-184 flex-col items-end gap-8 self-end">
//             {CHAT_PREVIEW.messages.map((message) => (
//               <p key={message} className={BUBBLE}>
//                 {message}
//               </p>
//             ))}
//           </div>
//           <div className="flex gap-4">
//             <span className="flex size-38 shrink-0 items-center rounded-full bg-[image:var(--gradient-jumpa-landing)] py-13 pr-8 pl-7">
//               <Image
//                 src="/logo/mark/lemon.png"
//                 alt=""
//                 width={803}
//                 height={381}
//                 sizes="23px"
//                 className="h-12 w-23 object-contain"
//               />
//             </span>
//             <p className={`${BUBBLE} w-238 px-10`}>{CHAT_PREVIEW.reply}</p>
//           </div>
//         </div>

//         <div className="flex w-369 flex-col gap-10 rounded-u-32 border-u-1 border-jumpa-white/20 bg-jumpa-black/30 p-9 shadow-u-40/20">
//           <div className="rounded-u-22 bg-jumpa-white p-10">
//             <QuickActionChips variant="hero" />
//           </div>
//           <div className="flex gap-10">
//             <div className="flex h-46 w-285 items-center gap-10 rounded-u-22 bg-jumpa-white p-4">
//               <span className="flex h-38 w-46 shrink-0 items-center justify-center rounded-u-32 bg-jumpa-neutral-250">
//                 <CirclePlusIcon className="size-24 text-jumpa-grey-600" />
//               </span>
//               <span className="text-u-10/20 font-medium tracking-jumpa text-jumpa-black/20">
//                 {CHAT_PREVIEW.composer}
//               </span>
//             </div>
//             <span className="flex size-46 shrink-0 items-center justify-center rounded-u-32 bg-jumpa-alt-400">
//               <MicrophoneIcon className="size-24 text-jumpa-secondary-600" />
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

function ChatPanelImage() {
  return (
    <div
      style={revealStep(8)}
      className="frame-393 stagger absolute top-1/2 left-200 w-393 -translate-y-1/2 animate-reveal-zoom"
    >
      <Image
        src="/images/landing/chatPanelHero.png"
        alt="chatPanelHero"
        width={400}
        height={621}
        priority
        className="h-full w-full"
      />
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative">
      <div className="relative mx-auto w-393 pt-56.75 md:w-1440 md:pt-121">
        {/* Each glow carries its own `--drift` so the page's decorative layers
            never move in lockstep. The hero's is the gentlest — it is the first
            thing on screen and sits closest to its design position. */}
        <DotGlow
          tone="grey"
          className="drift hidden md:top-298 md:left-0 md:block md:w-1440 [--drift:24]"
        />

        {/* The hero's entrance runs from plain `animate-*` utilities, not from
            `data-reveal`: it is always above the fold, so it has to play at the
            first paint rather than wait for hydration. `--i` sequences the whole
            column on the 70ms `.stagger` step. */}
        <div className="mx-auto flex w-320 flex-col items-center gap-15 text-center md:w-794 md:gap-30">
          <SectionBadge
            variant="outline"
            icon={<GlobeBoldIcon />}
            className="animate-drop-in text-u-5.5 md:text-u-14"
          >
            {HERO.badge.lead}
            <strong className="font-medium">{HERO.badge.strong}</strong>
            {HERO.badge.tail}
          </SectionBadge>

          <div className="flex w-full flex-col gap-15 md:gap-30">
            <h1 className="text-u-40/40 font-medium tracking-jumpa md:text-u-100/80">
              {/* The split is decorative; this is the sentence a screen reader
                  gets, so the heading is not read out letter by letter. */}
              <span className="sr-only">
                {HERO.heading.lead}
                {HERO.heading.accent}
              </span>
              <span aria-hidden="true">
                <HeadlineChars text={HERO.heading.lead} />
                {/* A zero-width slot, so the caret costs the line no layout and
                    the heading wraps exactly where it did. */}
                <span className="relative inline-block w-0">
                  {/* Nudged back into the word space, so the bar sits in the
                      gap rather than against the next glyph's stem. */}
                  <span className="type-caret absolute bottom-[0.06em] left-[-0.16em] h-[0.76em] w-[0.055em] rounded-full bg-jumpa-primary-600" />
                </span>
                {/* One unit, never split: a per-character opacity stops the
                    gradient painting through `bg-clip-text` — it renders blank. */}
                <span
                  style={revealStep(LEAD_CHARS)}
                  className="headline-accent inline-block"
                >
                  {HERO.heading.accent}
                </span>
              </span>
            </h1>
            <p
              style={revealStep(SUBHEAD_STEP)}
              className="stagger animate-reveal text-u-12/18 tracking-jumpa md:text-u-22/32"
            >
              {HERO.subhead}
            </p>
          </div>

          <div style={revealStep(FORM_STEP)} className="stagger animate-reveal">
            <HeroEmailForm />
          </div>
        </div>

        <div className="frame-1300 relative mx-auto mt-30.25 w-336.75 md:mt-114 md:w-1300">
          <div className="relative h-780 w-1300 overflow-hidden rounded-u-24 md:h-699">
            <Image
              src="/images/landing/hero-photo-mobile.webp"
              alt=""
              width={1300}
              height={780}
              priority
              sizes="100vw"
              className="h-full w-full object-cover md:hidden"
            />
            <Image
              src="/images/landing/hero-photo.webp"
              alt=""
              width={1920}
              height={1032}
              priority
              sizes="100vw"
              className="hidden h-full w-full object-cover md:block"
            />

            <ChatPanelImage />
            {/* <ChatPanel /> */}
          </div>
        </div>
      </div>
    </section>
  );
}
