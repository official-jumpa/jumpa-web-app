import type { ReactNode } from "react";
import { ShieldTickIcon } from "@/components/ui/icons/shield-tick";

/** Shielded small print: what the saver is agreeing to on this screen. */
export function ConsentNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2.5 text-xs leading-4.25 tracking-jumpa-snug text-jumpa-grey-500">
      <ShieldTickIcon className="size-4.5 shrink-0 text-jumpa-primary-600" />
      <span>{children}</span>
    </p>
  );
}
