import type { MomentImage } from "@/hooks/use-moment-image";

/**
 * The share card as it will be posted. Keyed by the caller per moment, so a
 * new card lands; an amounts toggle only cross-fades the image.
 */
export function ShareCardPreview({
  image,
  alt,
  land,
}: {
  image: MomentImage;
  alt: string;
  /** Plays the landing on the first paint — a fresh celebration, not a reshare. */
  land: boolean;
}) {
  return (
    <span
      className={`relative block aspect-[4/5] w-[min(12rem,26dvh)] overflow-hidden rounded-surface bg-[image:var(--gradient-jumpa-receipt)] shadow-jumpa-card ${
        land ? "animate-land" : "animate-pop-in"
      }`}
    >
      {image.url ? (
        // biome-ignore lint/performance/noImgElement: a blob URL cannot go through next/image
        <img
          src={image.url}
          alt={alt}
          className={`size-full object-cover transition-opacity duration-300 ease-jumpa ${
            image.status === "rendering" ? "opacity-70" : "opacity-100"
          }`}
        />
      ) : (
        // A sweep, so a slow first draw reads as working rather than empty.
        <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-jumpa-white/15">
          <span className="progress-band block h-full w-1/3 animate-progress bg-jumpa-alt-400" />
        </span>
      )}
      {image.status === "error" ? (
        <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs leading-4 font-medium text-jumpa-white">
          The card could not be drawn here. You can still share the text.
        </span>
      ) : null}
    </span>
  );
}
