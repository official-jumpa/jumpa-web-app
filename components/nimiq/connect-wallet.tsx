import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { NimiqNotice } from "./nimiq-notice";

/** Inside Nimiq Pay, before the wallet has shared its address. */
export function ConnectWallet({
  connecting,
  error,
  onConnect,
}: {
  connecting: boolean;
  error?: string;
  onConnect: () => void;
}) {
  return (
    <NimiqNotice
      art={
        <span className="flex size-20 items-center justify-center rounded-panel bg-jumpa-primary-50">
          {/* Alpha-trimmed mark — the raw logo is mostly transparent padding. */}
          <Image
            src="/logo/mark/purple.png"
            alt=""
            width={803}
            height={381}
            className="w-11"
          />
        </span>
      }
      title="Connect your wallet"
      body="Jumpa uses your USDT on Polygon in Nimiq Pay. No account, no sign-up."
    >
      <div className="flex justify-center">
        <FieldError>{error}</FieldError>
      </div>
      <Button
        variant="gradient"
        size="lg"
        onClick={onConnect}
        disabled={connecting}
      >
        {connecting ? "Connecting…" : "Connect Nimiq Pay"}
      </Button>
    </NimiqNotice>
  );
}
