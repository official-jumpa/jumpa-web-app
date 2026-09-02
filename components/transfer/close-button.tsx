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
      <CloseIcon className={size === "sm" ? "size-3" : "size-3.5"} />
    </button>
  );
}
