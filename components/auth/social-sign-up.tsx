"use client";

import Image from "next/image";
import { signIn } from "@/lib/auth-client";

const PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" },
] as const;

export function SocialSignUp({
  label = "Or Sign Up With",
}: {
  label?: string;
}) {
  const handleSocialSignIn = async (providerId: string) => {
    if (providerId === "google") {
      try {
        await signIn.social({
          provider: "google",
          callbackURL: "/api/auth/callback",
        });
      } catch (error) {
        console.error("[SocialSignUp] Google sign-in failed:", error);
      }
    }
  };

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex items-center gap-2.75">
        <span className="h-px flex-1 bg-jumpa-neutral-200" />
        <span className="text-xs leading-3.5 text-jumpa-neutral-500">
          {label}
        </span>
        <span className="h-px flex-1 bg-jumpa-neutral-200" />
      </div>

      <div className="flex flex-col gap-2">
        {PROVIDERS.map(({ id, label }) => {
          const isEnabled = id === "google";
          return (
            <button
              key={id}
              type="button"
              disabled={!isEnabled}
              onClick={() => handleSocialSignIn(id)}
              className="flex h-14 items-center justify-center gap-2 rounded-pill border border-jumpa-neutral-100 bg-jumpa-neutral-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:bg-jumpa-neutral-100 transition-colors"
            >
              <Image
                src={`/images/auth/${id}.png`}
                alt=""
                width={16}
                height={16}
                className="size-4 object-contain"
              />
              <span className="text-xs leading-4.5 font-medium text-jumpa-neutral-600">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
