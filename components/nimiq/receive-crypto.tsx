import type { Address } from "viem";
import { DepositDetails } from "@/components/assets/deposit-details";
import { ScreenHeader } from "@/components/ui/screen-header";
import { MINI_APP_PATH } from "@/lib/nimiq/views";

const NOTES = [
  "Only send **USDT** on the **Polygon** network. Anything else is lost",
  "It lands in your Nimiq Pay wallet a few seconds after confirmation",
];

/** The connected wallet's own address: the mini app holds USDT on Polygon only. */
export function ReceiveCrypto({
  address,
  onBack,
}: {
  address: Address;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back={MINI_APP_PATH} onBack={onBack} title="USDT" round />
      <DepositDetails network="Polygon" address={address} notes={NOTES} />
    </div>
  );
}
