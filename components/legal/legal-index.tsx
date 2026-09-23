import Image from "next/image";
import { SettingLink } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SupportHeader } from "@/components/support/support-header";
import { FileIcon } from "@/components/ui/icons/file";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { LEGAL_DOCUMENTS, legalHref } from "@/lib/legal";

/** Bare `/legal`. The footer links straight to a document; this catches a trimmed URL. */
export function LegalIndex() {
  return (
    <div className="px-4.5 pb-12">
      <SupportHeader
        back="/"
        action={
          <Image
            src="/logo/wordmark/purple.png"
            alt="Jumpa"
            width={96}
            height={20}
            className="h-5 w-24 object-contain"
          />
        }
      >
        <p className="text-[13px] leading-4 font-medium text-jumpa-black">
          Legal
        </p>
      </SupportHeader>

      <div className="mt-6">
        <SettingSection label="Our policies">
          <SettingCard>
            <SettingLink
              href={legalHref("terms")}
              icon={FileIcon}
              label={LEGAL_DOCUMENTS.terms.short}
            />
            <SettingRule />
            <SettingLink
              href={legalHref("privacy")}
              icon={ShieldCheckIcon}
              label={LEGAL_DOCUMENTS.privacy.short}
            />
          </SettingCard>
        </SettingSection>
      </div>
    </div>
  );
}
