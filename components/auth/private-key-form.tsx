"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { getAssetLogo } from "@/lib/assets";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { NETWORKS } from "@/lib/networks";

function validatePrivateKeyFormat(key: string, chain: string): string | null {
  const trimmed = key.trim();
  const lowerChain = chain.toLowerCase();

  if (
    lowerChain === "stellar" ||
    lowerChain === "xlm" ||
    trimmed.startsWith("S") ||
    trimmed.startsWith("s")
  ) {
    const upper = trimmed.toUpperCase();
    const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
    const isHex = hex.length === 64 && /^[0-9a-fA-F]{64}$/.test(hex);

    if (!isHex) {
      if (!upper.startsWith("S") || upper.length !== 56) {
        return "Invalid Stellar secret key. Must start with 'S' and be 56 characters (e.g. S...) or a 64-character hex seed.";
      }
      // Stellar Base32 check (A-Z, 2-7)
      if (!/^[A-Z2-7]{56}$/.test(upper)) {
        return "Invalid Stellar secret key format. Must be valid Base32.";
      }
    }
  } else if (lowerChain === "solana" || lowerChain === "sol") {
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (
          !Array.isArray(parsed) ||
          (parsed.length !== 64 && parsed.length !== 32)
        ) {
          return "Invalid Solana secret key byte array length.";
        }
      } catch {
        return "Invalid Solana secret key byte array format.";
      }
    } else {
      const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
      const isHex = /^[0-9a-fA-F]+$/.test(hex);
      if (isHex && (hex.length === 64 || hex.length === 128)) {
        // Valid hex secret key
      } else if (!/^[1-9A-HJ-NP-Za-km-z]{40,90}$/.test(trimmed)) {
        return "Invalid Solana private key. Must be a valid Base58 string.";
      }
    }
  } else {
    // EVM chains (Ethereum, Base, etc.)
    const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      return "Invalid EVM private key. Must be a 64-character hexadecimal string.";
    }
  }

  return null;
}

export function PrivateKeyForm({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [network, setNetwork] = useState<string>(NETWORKS[0].id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [masked, setMasked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const selectedNetworkObj =
    NETWORKS.find((n) => n.id === network) || NETWORKS[0];

  const handleContinue = async () => {
    const trimmedKey = privateKey.trim();
    if (!trimmedKey) {
      setError("Please paste or enter a private key");
      return;
    }

    const validationErr = validatePrivateKeyFormat(trimmedKey, network);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure active session for unauthenticated visitors
      const session = await authClient.getSession();
      if (!session?.data?.user) {
        const anonRes = await authClient.signIn.anonymous();
        if (anonRes?.error) {
          setError(
            anonRes.error.message || "Failed to initialize anonymous session",
          );
          setLoading(false);
          return;
        }
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("setupPhrase");
        sessionStorage.setItem("setupPrivateKey", trimmedKey);
        sessionStorage.setItem("setupChain", network);
        sessionStorage.setItem("setupType", "privateKey");
      }

      router.push(nextHref);
    } catch (err: any) {
      setError(err?.message || "Failed to proceed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col">
        {/* Network Selector Dropdown */}
        <div className="mt-7.75 flex flex-col gap-2" ref={dropdownRef}>
          <span className="text-sm leading-4 font-medium text-jumpa-black">
            Network
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              className={cn(
                "flex h-14 w-full items-center gap-3 rounded-pill border bg-jumpa-primary-50 px-4.5 text-jumpa-primary-950 transition-all cursor-pointer",
                dropdownOpen
                  ? "border-jumpa-primary-300 ring-2 ring-jumpa-primary-200"
                  : "border-jumpa-primary-100 hover:border-jumpa-primary-200",
              )}
            >
              <Image
                src={getAssetLogo(selectedNetworkObj.id)}
                alt={selectedNetworkObj.label}
                width={26}
                height={26}
                className="size-6.5 shrink-0 rounded-full object-contain"
              />
              <span className="flex-1 text-left text-sm leading-4 font-semibold text-jumpa-black">
                {selectedNetworkObj.label}
              </span>
              <CaretDownIcon
                className={cn(
                  "size-5.5 shrink-0 text-jumpa-primary-950 transition-transform duration-200",
                  dropdownOpen && "rotate-180",
                )}
              />
            </button>

            {/* Floating Dropdown Menu with Coin Icons and Labels */}
            {dropdownOpen && (
              <div
                role="listbox"
                className="absolute top-full left-0 z-50 mt-2 w-full rounded-2xl border border-jumpa-primary-100 bg-white p-1.5 shadow-xl backdrop-blur-md animate-pop-in"
              >
                <div className="flex flex-col gap-1">
                  {NETWORKS.map(({ id, label }) => {
                    const isSelected = network === id;
                    return (
                      <button
                        type="button"
                        key={id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setNetwork(id);
                          setDropdownOpen(false);
                          if (error) setError(null);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all cursor-pointer",
                          isSelected
                            ? "bg-jumpa-primary-50 text-jumpa-primary-950 font-semibold"
                            : "text-jumpa-black hover:bg-jumpa-neutral-50",
                        )}
                      >
                        <Image
                          src={getAssetLogo(id)}
                          alt={label}
                          width={24}
                          height={24}
                          className="size-6 shrink-0 rounded-full object-contain"
                        />
                        <span className="flex-1 text-left">{label}</span>
                        {isSelected && (
                          <span className="size-2 rounded-full bg-jumpa-primary-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Private Key Input */}
        <label className="mt-5.25 flex flex-col gap-3">
          <span className="text-sm leading-4 font-medium text-jumpa-black">
            Private Key
          </span>
          <span className="flex h-25.5 items-center justify-center gap-7.5 rounded-panel border border-jumpa-primary-100 bg-jumpa-primary-50 py-3 pr-8.5 pl-6">
            <textarea
              value={privateKey}
              onChange={(event) => {
                setPrivateKey(event.target.value);
                if (error) setError(null);
              }}
              rows={2}
              spellCheck={false}
              autoCapitalize="none"
              placeholder="Paste your private key"
              className={`h-14 w-64 resize-none bg-transparent text-[12px] leading-3 font-medium text-jumpa-primary-950 outline-none placeholder:text-jumpa-primary-950/40 ${
                masked ? "[-webkit-text-security:disc]" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setMasked((on) => !on)}
              aria-label={masked ? "Show private key" : "Hide private key"}
              className="shrink-0 text-jumpa-primary-950 cursor-pointer"
            >
              <EyeOffIcon className="size-6" />
            </button>
          </span>
        </label>

        {error && (
          <p className="mt-2 text-xs text-jumpa-danger px-1">{error}</p>
        )}

        <p className="mt-4.25 flex gap-2 text-jumpa-warning">
          <SealAlertIcon className="size-6 shrink-0" />
          <span className="flex flex-col gap-1 text-xs leading-3.5">
            <span className="font-medium">
              Passcode for your self-custodial wallet.
            </span>
            <span>
              A 6-digit PIN is used to sign transactions and unlock your wallet
              on your device. It's never sent unencrypted to Jumpa servers.
            </span>
          </span>
        </p>
      </div>

      <Button
        type="button"
        variant="gradient"
        size="lg"
        disabled={loading}
        className="mt-8 cursor-pointer disabled:opacity-50"
        onClick={handleContinue}
      >
        {loading ? "Verifying..." : "Continue"}
      </Button>
    </>
  );
}
