import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";

const SIZE = {
  sheet: { box: "size-16", icon: "size-8" },
  /** Fills the 137px slot the success badge holds, so the screen does not move. */
  screen: { box: "size-34.25", icon: "size-17" },
} as const;

/** The warning badge every failure surface shares. */
export function WarningMedallion({
  size = "sheet",
}: {
  size?: keyof typeof SIZE;
}) {
  return (
    <span
      className={`mx-auto flex ${SIZE[size].box} items-center justify-center rounded-full bg-jumpa-warning-50 text-jumpa-warning`}
    >
      <TriangleWarningIcon className={SIZE[size].icon} />
    </span>
  );
}
