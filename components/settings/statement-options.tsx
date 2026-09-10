import { Fragment } from "react";
import { SettingLink } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
} from "@/components/settings/setting-section";
import { DownloadIcon } from "@/components/ui/icons/download";
import { FileArrowDownAltIcon } from "@/components/ui/icons/file-arrow-down-alt";
import {
  STATEMENT_KINDS,
  STATEMENT_ORDER,
  statementHref,
} from "@/lib/statements";

/** Cards is the one drawn with the plain download glyph. */
const ICON = (kind: string) =>
  kind === "cards" ? DownloadIcon : FileArrowDownAltIcon;

/** The four statements. Reached from the request sheet's "Custom Duration". */
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
