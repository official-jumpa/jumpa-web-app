import type { ComponentType, SVGProps } from "react";
import { CalendarDaysIcon } from "@/components/ui/icons/calendar-days";
import { ClockIcon } from "@/components/ui/icons/clock";
import { MoonIcon } from "@/components/ui/icons/moon";
import { SunIcon } from "@/components/ui/icons/sun";
import type { AutoSaveCadence } from "@/lib/savings-auto-save";

/** Each rhythm's glyph, kept beside the screens so `lib/` stays free of React. */
export const CADENCE_ICON: Record<
  AutoSaveCadence,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  daily: SunIcon,
  weekly: CalendarDaysIcon,
  monthly: MoonIcon,
  custom: ClockIcon,
};
