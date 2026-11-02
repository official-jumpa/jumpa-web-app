import Image from "next/image";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MOBILE_NETWORKS } from "@/lib/bills";

/** Carrier picker behind the caret beside the bill phone field. */
export function NetworkSheet({
  selected,
  onSelect,
  onClose,
}: {
  selected: string;
  onSelect: (network: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-base leading-5 font-semibold text-jumpa-ink">
        Choose network
      </h2>
      <ul className="mt-4 flex items-start justify-between gap-2 rounded-surface bg-jumpa-neutral-50 p-4">
        {MOBILE_NETWORKS.map((entry) => {
          const active = entry.id === selected;
          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(entry.id)}
                className="tap flex w-16 flex-col items-center gap-1.5 active:scale-95"
              >
                <span
                  // Carrier brand disc; MTN and Glo carry their own in the art.
                  style={{ backgroundColor: entry.tint }}
                  className={`flex size-11 items-center justify-center overflow-hidden rounded-full ${
                    active ? "ring-2 ring-jumpa-primary-600" : ""
                  }`}
                >
                  <Image
                    src={entry.logo}
                    alt=""
                    width={44}
                    height={44}
                    className={
                      entry.tint
                        ? "size-6 object-contain"
                        : "size-full object-cover"
                    }
                  />
                </span>
                <span className="text-[10px] leading-3 font-medium text-jumpa-primary-950">
                  {entry.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
