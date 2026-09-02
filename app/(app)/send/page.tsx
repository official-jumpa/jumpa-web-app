import type { Metadata } from "next";
import { SendOptionList } from "@/components/transfer/send-options";
import { TransferHeader } from "@/components/transfer/transfer-header";

export const metadata: Metadata = { title: "Send" };

export default function SendPage() {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back="/home" title="Send" />
      <h2 className="mt-8 text-lg leading-normal font-medium text-jumpa-black">
        How do you want to send?
      </h2>
      <div className="mt-3">
        <SendOptionList />
      </div>
    </div>
  );
}
