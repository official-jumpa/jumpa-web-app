/** Two-line recipient on the right of a review summary, and in the amount header. */
export function RecipientTag({
  primary,
  secondary,
  align = "left",
}: {
  primary: string;
  secondary: string;
  align?: "left" | "right";
}) {
  return (
    <span
      className={`flex min-w-0 flex-col ${align === "right" ? "text-right" : "text-left"}`}
    >
      <span className="truncate text-[10px] leading-3.5 font-semibold text-jumpa-primary-600">
        {primary}
      </span>
      <span className="truncate text-[10px] leading-3.5 font-medium text-jumpa-primary-600">
        {secondary}
      </span>
    </span>
  );
}
