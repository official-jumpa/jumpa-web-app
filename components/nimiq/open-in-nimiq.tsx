import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { NIMIQ_OPEN_URL } from "@/lib/nimiq/constants";
import { NimiqNotice } from "./nimiq-notice";

const STEPS = [
  "Scan the code with your phone",
  "Jumpa opens in Nimiq Pay",
  "Connect your wallet. No sign-up",
];

/** Shown in an ordinary browser: the mini app only works inside Nimiq Pay. */
export function OpenInNimiq({ dailyUsd }: { dailyUsd: number }) {
  return (
    <NimiqNotice
      art={
        <div className="rounded-surface bg-jumpa-white p-4 text-jumpa-black inset-ring inset-ring-jumpa-neutral-100">
          {/* currentColor keeps the modules on a token rather than a hex prop; level H survives the logo. */}
          <QRCodeSVG
            value={NIMIQ_OPEN_URL}
            size={168}
            level="H"
            marginSize={0}
            bgColor="transparent"
            fgColor="currentColor"
            imageSettings={{
              src: "/logo/mark/purple.png",
              width: 40,
              height: 19,
              excavate: true,
            }}
            title="QR code that opens Jumpa in Nimiq Pay"
          />
        </div>
      }
      title="Open Jumpa in Nimiq Pay"
      body={
        <>
          <p className="text-balance">
            Cash out USDT to any Nigerian bank, or top up with Naira. Up to $
            {dailyUsd} a day.
          </p>
          <ol className="mt-5 flex flex-col gap-3 rounded-surface bg-jumpa-neutral-50 p-4 text-left">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-50 text-xs font-semibold text-jumpa-primary-600">
                  {index + 1}
                </span>
                <span className="text-jumpa-neutral-800">{step}</span>
              </li>
            ))}
          </ol>
        </>
      }
    >
      <p className="text-center text-xs text-jumpa-neutral-500">
        Already on your phone?
      </p>
      <Button variant="gradient" size="lg" href={NIMIQ_OPEN_URL}>
        Open in Nimiq Pay
      </Button>
    </NimiqNotice>
  );
}
