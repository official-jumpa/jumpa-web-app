import { Fragment } from "react";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import type { Transaction } from "@/lib/wallet";

const ROWS: Transaction[] = [
  { id: "1", kind: "send", chain: "eth", title: "USDC Deposit", detail: "Received • Today, 1:12 PM", amount: "+100 USDC", status: "completed" },
  { id: "2", kind: "receive", title: "USDC Deposit", detail: "Received • Today, 1:12 PM", amount: "+100 USDC", status: "completed" },
  { id: "3", kind: "data", title: "Data", detail: "Received • Today, 1:12 PM", amount: "+100 USDC", status: "completed" },
  { id: "4", kind: "swap", title: "Swap", detail: "Received • Today, 1:12 PM", amount: "+100 USDC", status: "completed" },
  { id: "5", kind: "airtime", title: "Airtime", detail: "Received • Today, 1:12 PM", amount: "+100 USDC", status: "completed" },
  { id: "6", kind: "invest", title: "Comercial Paper", detail: "Received • Today, 1:12 PM", amount: "+100 USDC", status: "completed" },
  { id: "7", kind: "card", title: "Card Deposit", detail: "Failed • Today, 1:12 PM", amount: "+100 USDC", status: "failed" },
];

export default function TxCheckPage() {
  return (
    <div className="mx-auto w-full max-w-app">
      <div className="px-4.5 py-6">
        <div className="flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 py-5">
          {ROWS.map((transaction, index) => (
            <Fragment key={transaction.id}>
              {index > 0 ? <TransactionRule /> : null}
              <TransactionRow transaction={transaction} />
            </Fragment>
          ))}
        </div>
      </div>
      <TransactionDetail id="demo" />
    </div>
  );
}
