/** Masked fixed-length code. `leading-[0]` keeps each rule on the baseline. */
export function PinDisplay({
  length,
  value,
  label,
}: {
  length: number;
  value: string;
  /** Optional caption above the box, e.g. "Enter your pin". */
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {label ? (
        <p className="text-base leading-5.5 font-medium text-jumpa-black">
          {label}
        </p>
      ) : null}

      <div className="flex h-25 items-center justify-center gap-5 rounded-panel border border-jumpa-primary-100 bg-jumpa-primary-50">
        {Array.from({ length }, (_, slot) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: slots never reorder
            key={slot}
            className="flex h-10 w-7.5 flex-col justify-end text-jumpa-primary-950"
          >
            <span className="mb-3.5 text-center font-numeric text-4xl leading-[0]">
              {slot < value.length ? "*" : ""}
            </span>
            <span className="h-0.75 w-full rounded-full bg-current" />
          </span>
        ))}
      </div>
    </div>
  );
}
