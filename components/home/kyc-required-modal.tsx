import { Button } from "@/components/ui/button";
import { UserAlt1Icon } from "@/components/ui/icons/user-alt-1";
import { SheetPortal } from "@/components/ui/sheet-portal";

/** Raised when someone without KYC tries to open a naira account. */
export function KycRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    // On `SheetPortal`, not `BottomSheet`: this is raised from inside the home
    // column, where `RiseIn` is the containing block for anything `fixed`.
    <SheetPortal onClose={onClose} className="px-6 pb-7.5">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
          <UserAlt1Icon className="size-8" />
        </span>

        <h2 className="mt-4 text-xl leading-6 font-bold text-jumpa-black">
          Identity Verification Required
        </h2>

        <p className="mt-2 text-sm leading-5 text-jumpa-neutral-700">
          To comply with banking regulations and issue your dedicated Naira
          virtual account, please complete your identity verification (KYC)
          first.
        </p>

        <Button
          variant="gradientSheet"
          size="lg"
          className="mt-6 font-semibold"
          href="/kyc"
        >
          Complete KYC
        </Button>

        <Button
          size="lg"
          className="mt-2.5 font-semibold text-jumpa-neutral-700"
          onClick={onClose}
        >
          Maybe Later
        </Button>
      </div>
    </SheetPortal>
  );
}
