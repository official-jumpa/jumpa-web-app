import Image from "next/image";
import { cn } from "@/lib/cn";

/** Shown wherever a history list has nothing in it yet. */
export function TransactionEmpty({ className }: { className?: string }) {
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
        Your recent transfer and swap activities will appear here
      </p>
    </div>
  );
}
