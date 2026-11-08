"use client";

import {
  SUPPORT_OPTIONS,
  type SupportOption,
  SupportOptionList,
} from "@/components/support/support-options";
import { WhatsappIcon } from "@/components/ui/icons/whatsapp";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { JUMPA_COMMUNITY_WHATSAPP_URL } from "@/lib/support";

/** Live chat and the FAQ screens need a Jumpa account, so the mini app offers email and the community. */
export const NIMIQ_SUPPORT_OPTIONS: SupportOption[] = [
  ...SUPPORT_OPTIONS.filter((option) => option.id === "email"),
  {
    id: "community",
    Icon: WhatsappIcon,
    title: "Jumpa community",
    caption: "Ask us on WhatsApp",
    href: JUMPA_COMMUNITY_WHATSAPP_URL,
    external: true,
    newTab: true,
  },
];

/** Help, raised from the mini app's header. */
export function NimiqSupportSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col items-center pt-3">
        <h2 className="sr-only">Help and support</h2>
        <SupportOptionList options={NIMIQ_SUPPORT_OPTIONS} />
      </div>
    </SheetPortal>
  );
}
