import type { ComponentType, SVGProps } from "react";
import { Select } from "@/components/ui/select";
import { IconTile } from "./icon-tile";

/** Grey heading over a setup section: "Pay with", "Preferred time". */
export const SECTION_LABEL =
  "text-sm leading-4.5 font-medium tracking-jumpa-snug text-jumpa-grey-500";

/** A labelled schedule row that opens a list to pick from. */
export function SchedulePicker({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <>
      <h2 className={`mt-5.25 ${SECTION_LABEL}`}>{label}</h2>
      <Select
        variant="row"
        label={label}
        value={value}
        options={options}
        onValueChange={onChange}
        className="mt-2.5"
        icon={
          <IconTile size="md" tone="soft">
            <Icon className="size-6" />
          </IconTile>
        }
      />
    </>
  );
}
