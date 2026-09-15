import Image from "next/image";
import { DotGlow } from "@/components/landing/dot-glow";
import { HeroEmailForm } from "@/components/landing/email-capture-form";
import { QuickActionChips } from "@/components/landing/quick-action-chips";
import { SectionBadge } from "@/components/landing/section-badge";
import { CirclePlusIcon } from "@/components/ui/icons/circle-plus";
import { GlobeBoldIcon } from "@/components/ui/icons/globe-bold";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";
import { CHAT_PREVIEW, HERO } from "@/lib/landing";

const BUBBLE =
  "rounded-full bg-jumpa-neutral-95 px-26 py-11.5 text-u-13/16 tracking-jumpa text-jumpa-black";

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
//           className="-z-10 object-cover lg:hidden"
//         />
//         <Image
//           src="/images/landing/hero-glass-backdrop.webp"
//           alt=""
//           fill
//           sizes="(min-width: 1024px) 393px, 1px"
//           className="-z-10 hidden object-cover lg:block"
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
    <div className="frame-393 absolute top-1/2 left-200 w-393 -translate-y-1/2">
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
      <div className="relative mx-auto w-393 pt-56.75 lg:w-1440 lg:pt-121">
        <DotGlow
          tone="grey"
          className="hidden lg:top-298 lg:left-0 lg:block lg:w-1440"
        />

        <div className="mx-auto flex w-320 flex-col items-center gap-15 text-center lg:w-794 lg:gap-30">
          <SectionBadge
            variant="outline"
            icon={<GlobeBoldIcon />}
            className="text-u-5.5 lg:text-u-14"
          >
            {HERO.badge.lead}
            <strong className="font-medium">{HERO.badge.strong}</strong>
            {HERO.badge.tail}
          </SectionBadge>

          <div className="flex w-full flex-col gap-15 lg:gap-30">
            <h1 className="text-u-40/40 font-medium tracking-jumpa lg:text-u-100/80">
              {HERO.heading.lead}
              <span className="bg-[image:var(--gradient-jumpa-landing)] bg-clip-text text-transparent">
                {HERO.heading.accent}
              </span>
            </h1>
            <p className="text-u-12/18 tracking-jumpa lg:text-u-22/32">
              {HERO.subhead}
            </p>
          </div>

          <HeroEmailForm />
        </div>

        <div className="frame-1300 relative mx-auto mt-30.25 w-336.75 lg:mt-114 lg:w-1300">
          <div className="relative h-780 w-1300 overflow-hidden rounded-u-24 lg:h-699">
            <Image
              src="/images/landing/hero-photo-mobile.webp"
              alt=""
              width={1300}
              height={780}
              priority
              sizes="100vw"
              className="h-full w-full object-cover lg:hidden"
            />
            <Image
              src="/images/landing/hero-photo.webp"
              alt=""
              width={1920}
              height={1032}
              priority
              sizes="100vw"
              className="hidden h-full w-full object-cover lg:block"
            />

            <ChatPanelImage />
            {/* <ChatPanel /> */}
          </div>
        </div>
      </div>
    </section>
  );
}
