"use client";

import { SettingLink } from "@/components/settings/setting-row";
import { statementHref } from "@/lib/statements";
import { ClipboardTextIcon } from "@/components/ui/icons/clipboard-text";

export function StatementRequestTrigger() {
  return (
    <SettingLink
      href={statementHref("all")}
      icon={ClipboardTextIcon}
      label="Request Account Statements"
    />
  );
}
