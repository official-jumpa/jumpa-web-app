import Link from "next/link";
import { GearIcon } from "@/components/ui/icons/gear";

/** Trailing header control on the profile screens. */
export function SettingsGearLink() {
  return (
    <Link
      prefetch={false}
      href="/profile/settings"
      aria-label="Settings"
      className="flex size-9.5 items-center justify-center rounded-pill bg-jumpa-neutral-50 text-jumpa-primary-950 tap active:scale-95"
    >
      <GearIcon className="size-4.75" />
    </Link>
  );
}
