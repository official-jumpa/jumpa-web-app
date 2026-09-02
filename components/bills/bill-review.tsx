import Image from "next/image";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import type { MobileNetwork } from "@/lib/bills";

/**
 * Left label pill and the carrier on the right — the summary row both bill
 * flows put at the top of their review sheet.
 */
export function BillSummary({
  label,
  phone,
  network,
}: {
  label: string;
  phone: string;
  network: MobileNetwork;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 rounded-pill bg-jumpa-secondary-100 px-3 py-1.5 text-[10px] leading-4 font-medium text-jumpa-primary-950">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2">
        <span
          style={{ backgroundColor: network.tint }}
          className="flex size-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full"
        >
          <Image
            src={network.logo}
            alt=""
            width={34}
            height={34}
            className={
              network.tint ? "size-5 object-contain" : "size-full object-cover"
            }
          />
        </span>
        <RecipientTag primary={phone} secondary={network.label} />
      </div>
    </div>
  );
}
