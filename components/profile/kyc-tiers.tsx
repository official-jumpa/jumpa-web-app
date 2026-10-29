import Image from "next/image";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import {
  currentTierLevel,
  findTier,
  KYC_TIERS,
  type KycTier,
  type KycTierStatus,
  TOP_TIER,
  tierStatus,
} from "@/lib/kyc-tiers";
import { profileHref } from "@/lib/profile";

const PILL: Record<KycTierStatus, { label: string; className: string }> = {
  done: {
    label: "Done",
    className:
      "h-5.5 bg-jumpa-success-50 font-medium tracking-[-0.02em] text-jumpa-success-700",
  },
  current: {
    label: "Current",
    className: "h-5.75 bg-jumpa-primary-600 font-semibold text-jumpa-white",
  },
  next: {
    label: "Next",
    className: "h-5.75 bg-jumpa-primary-50 font-semibold text-jumpa-primary-950",
  },
};

/** Purple hex with the crown; layers sit at their design offsets. */
function CrownBadge() {
  return (
    <span className="absolute top-4.75 right-[21.5px] h-[69.8653px] w-[61.9462px]">
      <Image
        src="/images/kyc-tiers/crown-hex-outer.svg"
        alt=""
        width={61.9462}
        height={69.8653}
        className="absolute top-0 left-0 max-w-none"
      />
      <Image
        src="/images/kyc-tiers/crown-hex-inner.svg"
        alt=""
        width={50.6084}
        height={56.5796}
        className="absolute top-[6.64px] left-[5.67px] max-w-none"
      />
      <Image
        src="/images/kyc-tiers/crown.svg"
        alt=""
        width={29}
        height={18.85}
        className="absolute top-[21.94px] left-[16.47px] max-w-none"
      />
      <span className="absolute top-[42.65px] left-[21.65px] h-[3.29px] w-[18.643px] rounded-full border-[0.2px] border-jumpa-white bg-linear-to-b from-jumpa-surface-dim to-jumpa-lavender-300 to-[123%]" />
    </span>
  );
}

function TierHero({ current }: { current: number }) {
  const tier = findTier(current);
  const next = current < TOP_TIER ? current + 1 : null;

  return (
    <section className="relative mt-5 h-35.75 overflow-clip rounded-row bg-jumpa-primary-950">
      <Image
        src="/images/kyc-tiers/hero-arc.svg"
        alt=""
        width={141.789}
        height={71.75}
        className="absolute top-[0.25px] right-px max-w-none"
      />
      <div className="absolute top-[22.5px] left-5.5 flex w-48.25 flex-col gap-1.75">
        <p className="text-xs leading-none font-bold text-jumpa-primary-300">
          YOUR CURRENT LEVEL
        </p>
        <h2 className="text-[32px] leading-none font-bold text-jumpa-white">
          Tier {current}
        </h2>
        <p className="text-xs leading-[1.2] tracking-jumpa-snug text-jumpa-white">
          {tier ? `You're all set to ${tier.dailyLimit} a day.` : null}
          <br />
          {next
            ? `Move to Tier ${next} for a much higher limit.`
            : "You're on the highest tier."}
        </p>
        <div className="flex h-1.5 gap-1.5" aria-hidden="true">
          {KYC_TIERS.map(({ level }) => (
            <span
              key={level}
              className={`flex-1 rounded-full ${
                level <= current ? "bg-jumpa-alt-400" : "bg-jumpa-tier-track"
              }`}
            />
          ))}
        </div>
      </div>
      <CrownBadge />
      <span className="absolute top-25.25 right-5.25 flex h-5 items-center rounded-full bg-jumpa-primary-600 px-3 text-xs leading-none font-medium text-jumpa-white">
        Tier {current}
      </span>
    </section>
  );
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs leading-[1.2] tracking-jumpa-snug text-jumpa-ink-muted">
        {label}
      </span>
      <span
        className={`mt-0.75 text-sm leading-[1.2] tracking-jumpa text-jumpa-ink ${
          strong ? "font-semibold" : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TierCard({ tier, status }: { tier: KycTier; status: KycTierStatus }) {
  const pill = PILL[status];

  return (
    <article
      className={`h-31.75 overflow-clip rounded-row border border-jumpa-lavender-200 px-4.25 pt-4.25 ${
        status === "current" ? "bg-jumpa-surface" : "bg-jumpa-white"
      }`}
    >
      <div className="flex items-start">
        <Image
          src="/images/kyc-tiers/tier-badge.svg"
          alt=""
          width={34}
          height={40}
          className="ml-0.75 shrink-0"
        />
        <div className="ml-4 min-w-0">
          <h3 className="mt-0.5 text-base leading-none font-bold text-jumpa-ink">
            Tier {tier.level}
          </h3>
          <p className="mt-1.5 text-xs leading-[1.2] tracking-[-0.04em] text-jumpa-ink-muted">
            {tier.requirement}
          </p>
        </div>
        <span
          className={`-mt-0.75 mr-0.75 ml-auto flex shrink-0 items-center rounded-full px-2.5 text-xs leading-none ${pill.className}`}
        >
          {pill.label}
        </span>
      </div>
      <div className="mx-px mt-2.5 h-px bg-jumpa-primary-50" />
      <div className="mt-2.25 flex items-start">
        <div className="w-31.25">
          <Stat label="Daily limit" value={`Up to ${tier.dailyLimit}`} />
        </div>
        <span className="h-8.25 w-px bg-jumpa-primary-50" />
        <div className="ml-10.75">
          <Stat
            label="Maximum transaction limit"
            value={
              tier.maxTransaction ? `Up to ${tier.maxTransaction}` : "Unlimited"
            }
            strong
          />
        </div>
      </div>
    </article>
  );
}

/** KYC tiers. Screen only — the level is derived from KYC status for now. */
export function KycTiers({ kycVerified }: { kycVerified: boolean }) {
  const current = currentTierLevel(kycVerified);

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <SettingsHeader back={profileHref()} title="Verification" size="lg" />

      <TierHero current={current} />

      <div className="mt-5 flex flex-col gap-5.25">
        {KYC_TIERS.map((tier) => (
          <TierCard
            key={tier.level}
            tier={tier}
            status={tierStatus(tier.level, current)}
          />
        ))}
      </div>

      {current < TOP_TIER ? (
        <div className="mt-auto pt-6">
          {/* TODO(backend): route to the next tier's own checks once they exist. */}
          <Button
            variant="brandAccent"
            size="lg"
            disabled
            className="disabled:opacity-50"
          >
            Upgrade to Tier {current + 1}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
