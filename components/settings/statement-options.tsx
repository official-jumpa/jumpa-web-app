import { Fragment } from "react";
import { SettingLink } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
} from "@/components/settings/setting-section";
import { DownloadIcon } from "@/components/ui/icons/download";
import { FileArrowDownAltIcon } from "@/components/ui/icons/file-arrow-down-alt";
import { SheetPortal } from "@/components/ui/sheet-portal";
import {
  STATEMENT_KINDS,
  STATEMENT_ORDER,
  statementHref,
} from "@/lib/statements";

/** Cards is the one drawn with the plain download glyph. */
const ICON = (kind: string) =>
  kind === "cards" ? DownloadIcon : FileArrowDownAltIcon;

/** The four statements, shared by the sheet and the standalone screen. */
export function StatementOptions() {
  return (
    <SettingCard>
      {STATEMENT_ORDER.map((kind, index) => (
        <Fragment key={kind}>
          {index > 0 ? <SettingRule /> : null}
          <SettingLink
            href={statementHref(kind)}
            icon={ICON(kind)}
            label={STATEMENT_KINDS[kind].label}
          />
        </Fragment>
      ))}
    </SettingCard>
  );
}

/** The same list raised over Settings, which is where the design draws it. */
export function StatementSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col gap-4 pt-1.5 pb-2">
        <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
          Statement Section
        </h2>
        <StatementOptions />
      </div>
    </SheetPortal>
  );
}
