import type { Metadata } from "next";
import { ReceiveOptionList } from "@/components/transfer/receive-options";
import { TransferHeader } from "@/components/transfer/transfer-header";

export const metadata: Metadata = { title: "Add Money" };

export default function ReceivePage() {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back="/home" title="Add Money" />
      <div className="mt-8">
        <ReceiveOptionList />
      </div>
    </div>
  );
}
