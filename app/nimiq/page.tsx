import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { NimiqMiniApp } from "@/components/nimiq/nimiq-mini-app";
import { AppColumn } from "@/components/ui/app-column";
import { JumpaLoaderScreen } from "@/components/ui/jumpa-loader";
import { nimiqConfig } from "@/lib/nimiq/config";

export const metadata: Metadata = {
  title: { absolute: "Jumpa for Nimiq Pay" },
  description:
    "Cash out USDT to a Nigerian bank or top up with Naira, inside Nimiq Pay.",
  robots: { index: false, follow: false },
};

/** Jumpa as a Nimiq Pay mini app: no Jumpa account, the connected wallet is the identity. */
export default async function NimiqPage() {
  // Read the flag per request, not at build time.
  await connection();
  const { enabled, dailyUsd, maxTxUsd, minUsd } = nimiqConfig();
  if (!enabled) notFound();

  return (
    <AppColumn>
      <Suspense fallback={<JumpaLoaderScreen />}>
        <NimiqMiniApp limits={{ dailyUsd, maxTxUsd, minUsd }} />
      </Suspense>
    </AppColumn>
  );
}
