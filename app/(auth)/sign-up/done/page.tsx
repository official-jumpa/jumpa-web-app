"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";

/* Wallet address panel — parked, not deleted. Uncomment together with the block
   in the body, `CopyButton` and `useEffect`/`useState`.

const [walletAddress, setWalletAddress] = useState<string>("");

useEffect(() => {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("userWalletAddress");
    if (stored) setWalletAddress(stored);
  }
}, []);

const displayAddress = walletAddress
  ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
  : "";
*/

export default function SignUpDonePage() {
  const router = useRouter();

  return (
    <AuthScreen
      header={<AuthHeader backHref="/sign-up/pin/confirm" />}
      className="[--auth-pb:67px]"
      footer={
        <Button
          type="button"
          onClick={() => router.replace("/home")}
          variant="gradient"
          size="lg"
          className="mt-8 cursor-pointer"
        >
          Go to Home
        </Button>
      }
    >
      <div className="flex flex-1 flex-col items-center">
        {/* The export carries 85px of transparent glow below the badge. */}
        <Image
          src="/images/auth/verified-badge.svg"
          alt=""
          width={219}
          height={276}
          priority
          className="mt-6 -mb-21.25"
        />

        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-[28px] leading-8.5 font-semibold text-jumpa-black">
            You're All Set
          </h1>
          <p className="max-w-73.5 text-sm leading-4.5 text-jumpa-neutral-800">
            Your account has been securely verified. You're ready to manage your
            portfolio and explore the market
          </p>

          {/*
          {displayAddress ? (
            <div className="flex w-full max-w-73.5 items-center justify-between gap-3 rounded-card border border-jumpa-neutral-100 bg-jumpa-neutral-50 py-2.5 pr-2.5 pl-4">
              <span className="flex min-w-0 flex-col text-left">
                <span className="text-[11px] leading-3.5 text-jumpa-neutral-400">
                  Wallet address
                </span>
                <span className="truncate text-sm leading-4.5 font-medium text-jumpa-black">
                  {displayAddress}
                </span>
              </span>
              // Copies the full address, not the truncated form on screen.
              <CopyButton value={walletAddress} className="size-11 shrink-0" />
            </div>
          ) : null}
          */}
        </div>
      </div>
    </AuthScreen>
  );
}
