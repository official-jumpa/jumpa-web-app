/** Thin meter. `onBrand` sits on the purple hero, `plain` on a white card, `muted` on a finished plan. */
const TONE = {
  onBrand: { track: "bg-jumpa-white/20", fill: "bg-jumpa-alt-400" },
  plain: { track: "bg-jumpa-primary-100", fill: "bg-jumpa-primary-600" },
  muted: { track: "bg-jumpa-neutral-100", fill: "bg-jumpa-neutral-300" },
} as const;

export function ProgressBar({
  value,
  tone = "plain",
}: {
  /** 0–100. */
  value: number;
  tone?: keyof typeof TONE;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block h-1.5 w-full overflow-hidden rounded-pill ${TONE[tone].track}`}
    >
      <span
        className={`block h-full origin-left animate-meter-fill rounded-pill transition-[width] duration-500 ease-jumpa ${TONE[tone].fill}`}
        style={{ width: `${value}%` }}
      />
    </span>
  );
}
