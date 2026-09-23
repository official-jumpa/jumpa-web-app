"use client";

import { useEffect } from "react";
import { PlaceholderScreen } from "@/components/ui/placeholder-screen";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error Boundary caught runtime exception]:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-center bg-jumpa-white px-4">
      <PlaceholderScreen
        art={
          <span className="text-5xl leading-none font-bold text-jumpa-primary-600">
            !
          </span>
        }
        title="Something went wrong"
        body="An unexpected error occurred while loading this page. Your wallet, transactions, and funds remain completely safe."
        action={{
          label: "Back to Home",
          href: "/home",
        }}
      />
      <div className="-mt-14 mb-8 flex justify-center px-4">
        <Button
          variant="soft"
          size="md"
          className="w-full"
          onClick={() => {
            if (typeof reset === "function") {
              reset();
            } else if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
