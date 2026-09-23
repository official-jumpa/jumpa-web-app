"use client";

import { useState } from "react";
import { SettingAction } from "@/components/settings/setting-row";
import { StatementRequestSheet } from "@/components/settings/statement-request";
import { ClipboardTextIcon } from "@/components/ui/icons/clipboard-text";

export function StatementRequestTrigger() {
  const [statementsOpen, setStatementsOpen] = useState(false);

  return (
    <>
      <SettingAction
        icon={ClipboardTextIcon}
        label="Request Account Statements"
        onClick={() => setStatementsOpen(true)}
      />
      {statementsOpen ? (
        <StatementRequestSheet onClose={() => setStatementsOpen(false)} />
      ) : null}
    </>
  );
}
