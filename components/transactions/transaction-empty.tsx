import Image from "next/image";
import { cn } from "@/lib/cn";

/** Shown wherever a history list has nothing in it yet. `history` is the transaction-history screen's art and copy. */
export function TransactionEmpty({
  className,
  variant = "card",
}: {
  className?: string;
  variant?: "card" | "history";
}) {
  if (variant === "history") {
    return (
      <div
        className={cn(
          "flex flex-col items-center text-center leading-none text-jumpa-ink-muted",
          className,
        )}
      >
        <Image
          src="/images/transactions/empty.svg"
          alt=""
          width={131}
          height={148}
          unoptimized
          className="h-37 w-32.75"
        />
        <p className="mt-6.5 text-xs tracking-jumpa-snug">No transaction found</p>
        <p className="mt-2 text-[10px] tracking-jumpa-snug">
          Your recent transactions will appear here
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-2 text-center text-jumpa-neutral-400",
        className,
      )}
    >
      <Image
        src="/images/home/transaction-history.png"
        alt=""
        width={244}
        height={286}
        className="w-30"
      />
      <p className="mt-3 text-xs leading-4 font-medium">No transactions found</p>
      <p className="mt-1 text-[10px] leading-3 text-jumpa-neutral-350">
        Your recent transactions will appear here
      </p>
    </div>
  );
}
