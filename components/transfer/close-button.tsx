import { CloseIcon } from "@/components/ui/icons/close";

/** Grey disc that dismisses a step or a sheet. */
export function CloseButton({
  onClick,
  label = "Close",
  size = "md",
}: {
  onClick: () => void;
  label?: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`tap flex shrink-0 items-center justify-center rounded-full border border-jumpa-neutral-50 bg-jumpa-grey-300 text-jumpa-white active:scale-90 ${
        size === "sm" ? "size-7.5" : "size-9.5"
      }`}
    >
      {/* The glyph is 14 of the icon's 24 units, so the box carries the extra. */}
      <CloseIcon className={size === "sm" ? "size-4.75" : "size-6"} />
    </button>
  );
}
