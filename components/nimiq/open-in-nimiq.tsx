import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import {
  NIMIQ_MINI_APP_ADDRESS,
  NIMIQ_OPEN_URL,
  NIMIQ_PAY_STORES,
} from "@/lib/nimiq/constants";
import { NimiqNotice } from "./nimiq-notice";

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-50 text-xs font-semibold text-jumpa-primary-600">
        {n}
      </span>
      <span className="pt-0.5 text-jumpa-neutral-800">{children}</span>
    </li>
  );
}

/** Shown in an ordinary browser: the mini app only works inside Nimiq Pay. */
export function OpenInNimiq({ dailyUsd }: { dailyUsd: number }) {
  return (
    <NimiqNotice
      back={<BackLink href="/" variant="corner" label="Back" />}
      art={null}
      title="Open Jumpa in Nimiq Pay"
      body={
        <>
          <p className="text-balance">
            Cash out USDT to any Nigerian bank, or top up with Naira. Up to $
            {dailyUsd} a day.
          </p>
          <div className="mt-5 flex flex-col gap-4 rounded-surface bg-jumpa-neutral-50 p-4 text-left">
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                Open the Nimiq Pay app (install it first if needed)
              </Step>
              <Step n={2}>
                Go to its browser / Mini Apps and type{" "}
                <strong className="font-semibold text-jumpa-black">
                  {NIMIQ_MINI_APP_ADDRESS}
                </strong>
              </Step>
            </ol>
            <CopyButton
              value={NIMIQ_MINI_APP_ADDRESS}
              label={`Copy ${NIMIQ_MINI_APP_ADDRESS}`}
              className="w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {NIMIQ_PAY_STORES.map((store) => (
              <Button
                key={store.label}
                variant="outline"
                size="sm"
                href={store.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {store.label}
              </Button>
            ))}
          </div>
        </>
      }
    >
      {/* The QR and the button both use the deeplink, which works once the directory lists Jumpa. */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-jumpa-neutral-500">
          On a computer? Scan with your phone
        </p>
        <div className="rounded-surface bg-jumpa-white p-3 text-jumpa-black inset-ring inset-ring-jumpa-neutral-100">
          {/* currentColor keeps the modules on a token rather than a hex prop; level H survives the logo. */}
          <QRCodeSVG
            value={NIMIQ_OPEN_URL}
            size={112}
            level="H"
            marginSize={0}
            bgColor="transparent"
            fgColor="currentColor"
            imageSettings={{
              src: "/logo/mark/purple.png",
              width: 27,
              height: 13,
              excavate: true,
            }}
            title="QR code that opens Jumpa in Nimiq Pay"
          />
        </div>
      </div>
      <Button variant="plain" size="sm" href={NIMIQ_OPEN_URL}>
        Open in Nimiq Pay
      </Button>
    </NimiqNotice>
  );
}
