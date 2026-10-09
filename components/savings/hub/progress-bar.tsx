/** Thin meter. `onBrand` sits on the purple hero, `plain` on a white card, `muted` on a finished plan. */
const TONE = {
  onBrand: {
    track: "bg-jumpa-white/20",
    fill: "bg-jumpa-alt-400",
    notch: "bg-jumpa-primary-600",
  },
  plain: {
    track: "bg-jumpa-primary-100",
    fill: "bg-jumpa-primary-600",
    notch: "bg-jumpa-neutral-50",
  },
  muted: {
    track: "bg-jumpa-neutral-100",
    fill: "bg-jumpa-neutral-300",
    notch: "bg-jumpa-neutral-50",
  },
} as const;

export function ProgressBar({
  value,
  tone = "plain",
  marks,
}: {
  /** 0–100. */
  value: number;
  tone?: keyof typeof TONE;
  /** Percentages to notch — the milestones, without drawing a label. */
  marks?: readonly number[];
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative block h-1.5 w-full overflow-hidden rounded-pill ${TONE[tone].track}`}
    >
      <span
        className={`block h-full origin-left animate-meter-fill rounded-pill transition-[width] duration-500 ease-jumpa ${TONE[tone].fill}`}
        style={{ width: `${value}%` }}
      />
      {/* A notch in the card's own colour reads as a cut, on the fill and the track alike. */}
      {marks
        ?.filter((mark) => mark > 0 && mark < 100)
        .map((mark) => (
          <span
            key={mark}
            className={`absolute inset-y-0 w-0.5 -translate-x-1/2 ${TONE[tone].notch}`}
            style={{ left: `${mark}%` }}
          />
        ))}
    </span>
  );
}
