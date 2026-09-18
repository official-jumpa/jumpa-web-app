/** r=54 on a 116 box, so the ring's own stroke has room at every edge. */
const CIRCUMFERENCE = 2 * Math.PI * 54;

/** The design's arc covers 225 degrees; the rest of the ring is the gap. */
const ARC = (CIRCUMFERENCE * 225) / 360;

/**
 * The brand spinner: a rotating arc around the Jumpa mark. It carries no
 * surface of its own, so it sits directly on whatever is behind it — the
 * modal's scrim, the page, a route's loading boundary.
 *
 * A server component; nothing here needs state.
 */
export function JumpaLoader({
  label = "Loading",
  className = "size-29",
  markClassName = "w-14.75",
}: {
  /** Announced to screen readers — the visual is decorative. */
  label?: string;
  /** Box size. The ring and mark scale with it. */
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center ${className}`}
    >
      {/* One rotating svg: the pale ring is a full circle, so turning it with
          the arc costs nothing and keeps them concentric. */}
      <svg
        viewBox="0 0 116 116"
        aria-hidden="true"
        className="absolute inset-0 size-full animate-spin"
      >
        <circle
          cx="58"
          cy="58"
          r="54"
          fill="none"
          strokeWidth="8"
          className="stroke-jumpa-primary-50"
        />
        <circle
          cx="58"
          cy="58"
          r="54"
          fill="none"
          strokeWidth="8"
          strokeDasharray={`${ARC} ${CIRCUMFERENCE - ARC}`}
          className="spinner-arc stroke-jumpa-primary-600"
        />
      </svg>

      {/* The alpha-trimmed mark; the raw logo is mostly padding. A plain <img>
          keeps this a server component with no optimiser round trip. */}
      {/** biome-ignore lint/performance/noImgElement: fixed-size local mark */}
      <img
        src="/logo/mark/purple.png"
        alt=""
        width={803}
        height={381}
        className={markClassName}
      />

      {/* `output` is the live region; a `role="status"` div is the same thing. */}
      <output className="sr-only">{label}</output>
    </span>
  );
}

/** The whole viewport, for a route's loading boundary and the auth shell. */
export function JumpaLoaderScreen({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <JumpaLoader label={label} />
    </div>
  );
}
