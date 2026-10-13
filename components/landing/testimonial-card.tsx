import Image from "next/image";
import { Art } from "@/components/landing/art";
import { MARQUEE_IMAGE } from "@/components/landing/marquee";
import { cn } from "@/lib/cn";
import type { Testimonial } from "@/lib/landing";

const STARS = 5;

function Avatar({
  avatar,
  eager,
}: {
  avatar: Testimonial["avatar"];
  eager?: boolean;
}) {
  return (
    <span className="relative block size-48 shrink-0 overflow-clip rounded-full bg-jumpa-sand">
      <Image
        src={avatar.src}
        width={avatar.width}
        height={avatar.height}
        sizes="96px"
        alt=""
        {...(eager ? MARQUEE_IMAGE : {})}
        style={avatar.box}
        className={cn(
          "absolute max-w-none object-cover",
          avatar.flip && "-scale-x-100",
        )}
      />
    </span>
  );
}

function Stars({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Rated 5 out of 5"
      className={cn("flex gap-4.25", className)}
    >
      {Array.from({ length: STARS }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed, identical stars.
        <Art key={i} src="/images/landing/star.svg" className="size-11.75" />
      ))}
    </span>
  );
}

/** Desktop card, drawn at the size the centred card takes in the carousel. */
export function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <article className="flex h-610 w-275.5 items-center justify-center overflow-clip rounded-u-17.75 bg-jumpa-white px-27.5 py-20 text-jumpa-black shadow-landing-quote">
      <div className="flex w-220.75 flex-col items-center gap-20.5">
        <div className="relative aspect-191/349 w-full overflow-clip rounded-u-16.5 border-u-1 border-jumpa-lavender-100">
          <Image
            src={item.shot.src}
            fill
            sizes="(min-width: 1440px) 221px, 16vw"
            alt={`${item.name}'s message in the Jumpa beta group`}
            style={{ objectPosition: item.shot.position }}
            className="object-cover"
          />
        </div>
        <div className="relative h-141.25 w-211.75">
          <Avatar avatar={item.avatar} />
          <p className="absolute top-24 left-62.75 flex -translate-y-1/2 flex-col -tracking-u-0.25">
            <span className="font-semibold text-u-11.75/17.25">
              {item.name}
            </span>
            <span className="font-medium text-jumpa-lavender-500 text-u-10.75/17.25">
              {item.role}
            </span>
          </p>
          <blockquote className="absolute top-86.75 right-0 left-5 -translate-y-1/2 font-medium text-u-13.75/20 -tracking-u-0.25">
            {item.quote}
          </blockquote>
          <Stars className="absolute top-129.5 left-5" />
        </div>
      </div>
    </article>
  );
}

/** Phone-frame card for the vertical marquee. */
export function TestimonialCardMobile({ item }: { item: Testimonial }) {
  return (
    <article className="flex h-611 w-362 flex-col items-start gap-14 rounded-u-24 bg-jumpa-white px-16 pt-16 pb-20 text-jumpa-black shadow-landing-quote-mobile">
      <div className="relative h-417 w-full overflow-clip rounded-u-16">
        <Image
          src={item.shot.src}
          fill
          sizes="(min-width: 768px) 1px, 82vw"
          alt={`${item.name}'s message in the Jumpa beta group`}
          {...MARQUEE_IMAGE}
          className="object-cover"
        />
      </div>
      <div className="flex items-center gap-17">
        <Avatar avatar={item.avatar} eager />
        <p className="flex flex-col font-semibold -tracking-u-0.25">
          <span className="text-u-11.75/17.25">{item.name}</span>
          <span className="font-medium text-jumpa-lavender-500 text-u-10.75/16">
            {item.role}
          </span>
        </p>
      </div>
      <blockquote className="font-medium text-u-16/23.25 -tracking-u-0.25">
        {item.quote}
      </blockquote>
      <Stars />
    </article>
  );
}
