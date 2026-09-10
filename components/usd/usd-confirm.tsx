import { useAuthContext } from "@/components/auth/AuthGuard";
import { SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
} from "@/components/settings/setting-section";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons/check";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { MobileAltIcon } from "@/components/ui/icons/mobile-alt";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { USD_PHONE } from "@/lib/usd-account";
import { ACCOUNT } from "@/lib/wallet";

/** The check spans half of its 20px badge, so the glyph box carries the rest. */
function VerifiedBadge() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-alt-400">
      <CheckIcon className="size-3.75" />
    </span>
  );
}

/** What we hold on the user, before the account is opened. */
export function UsdConfirm({ onContinue }: { onContinue: () => void }) {
  const auth = useAuthContext();
  const user = auth?.user;

  const name = user?.name || user?.jumpaTag || ACCOUNT.firstName;
  const email = user?.email || "Not added yet";
  const verified = ACCOUNT.kyc.completed >= ACCOUNT.kyc.total;

  return (
    <>
      <h1 className="mt-7.25 text-[28px] leading-7.5 font-semibold text-jumpa-black">
        Confirm your details
      </h1>
      <p className="mt-2 text-sm leading-4 text-jumpa-black">
        A quick verification helps us keep your account secure and meet
        regulatory requirements.
      </p>

      <SettingCard className="mt-8">
        <SettingRow icon={CircleUserIcon} label={name} />
        <SettingRule />
        <SettingRow icon={ShieldCheckIcon} label={email} />
        <SettingRule />
        <SettingRow icon={MobileAltIcon} label={USD_PHONE} />
        <SettingRule />
        <SettingRow
          icon={IdCardIcon}
          label="KYC Verification"
          action={verified ? <VerifiedBadge /> : null}
        />
      </SettingCard>

      <div className="mt-auto pt-10">
        <Button variant="gradient" size="lg" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </>
  );
}
