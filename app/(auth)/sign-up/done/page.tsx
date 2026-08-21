"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";

export default function SignUpDonePage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("userWalletAddress");
      if (stored) setWalletAddress(stored);
    }
  }, []);

  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
    : "Wallet Created";

  return (
    <AuthScreen
      header={null}
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
        </div>
      </div>
    </AuthScreen>
  );
}
