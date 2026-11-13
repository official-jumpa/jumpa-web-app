import { WalletOutlineIcon } from "@/components/ui/icons/wallet-outline";
import {
  type AutoSaveDraft,
  type AutoSaveSource,
  cadenceCopy,
  formatAutoSaveAmount,
  repeatLabel,
  type SourceBalances,
  sourceCaption,
  sourcesFor,
} from "@/lib/savings-auto-save";
import { AutoSaveCard } from "./auto-save-card";
import { ChoiceCard } from "./choice-card";
import { ConsentNote } from "./consent-note";
import { StepScreen } from "./step-screen";

/** Step 3: which wallet the money comes from. */
export function FundingStep({
  draft,
  balances,
  onChange,
  onBack,
  onContinue,
}: {
  draft: AutoSaveDraft;
  balances: SourceBalances;
  onChange: (source: AutoSaveSource) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { unit } = cadenceCopy(draft.cadence);

  return (
    <StepScreen
      step={3}
      title="Fund your auto-save"
      caption={`Pick the account Jumpa draws from each ${unit}.`}
      onBack={onBack}
      cta={{ label: "Continue", onClick: onContinue }}
    >
      <div className="-mx-0.5 mt-3">
        <AutoSaveCard
          amount={draft.amount}
          currency={draft.currency}
          cadence={draft.cadence}
          intervalMinutes={draft.intervalMinutes}
        />
      </div>

      <h2 className="mt-3 text-sm leading-4.5 font-medium tracking-jumpa-snug text-jumpa-grey-500">
        Pay with
      </h2>
      <div className="mt-2.5 flex flex-col gap-2">
        {sourcesFor(draft.currency).map((source) => (
          <ChoiceCard
            key={source.value}
            look="source"
            icon={WalletOutlineIcon}
            title={source.title}
            caption={sourceCaption(source, balances)}
            selected={source.value === draft.source}
            soon={source.soon}
            onSelect={() => onChange(source.value)}
          />
        ))}
      </div>

      <div className="mt-auto pt-6">
        <ConsentNote>
          You’re letting Jumpa move{" "}
          {formatAutoSaveAmount(draft.amount, draft.currency)} from this source{" "}
          {repeatLabel(draft).toLowerCase()}. Pause or cancel whenever you like.
        </ConsentNote>
      </div>
    </StepScreen>
  );
}
