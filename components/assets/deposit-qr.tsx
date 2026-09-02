"use client";

import { QRCodeSVG } from "qrcode.react";

/** Scannable code for the deposit address. */
export function DepositQr({ value }: { value: string }) {
  return (
    <div className="rounded-surface bg-jumpa-white p-4 text-jumpa-black">
      {/* currentColor keeps the module fill on a token rather than a hex prop. */}
      <QRCodeSVG
        value={value}
        size={200}
        marginSize={0}
        bgColor="transparent"
        fgColor="currentColor"
        title="Deposit address QR code"
      />
    </div>
  );
}
