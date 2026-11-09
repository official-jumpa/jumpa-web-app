"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import type { LookupStatus } from "@/hooks/use-recipient-lookup";
import { nimiqApi } from "@/lib/nimiq/api-client";
import {
  type Eip1193,
  ensurePolygon,
  isUserRejection,
  signTypedData,
} from "@/lib/nimiq/provider";
import { serializeTagClaim } from "@/lib/nimiq/tag-claim";
import { normaliseTag, TAG_MIN_LENGTH } from "@/lib/sign-up";

const DEBOUNCE_MS = 400;

/** Whether a handle is free across Nimiq Pay wallets and Jumpa accounts; stable for the tag form. */
export const checkNimiqTag = (handle: string) => nimiqApi.tagStatus(handle);

/** This wallet's Jumpa tag (undefined until known), and the claim Nimiq Pay signs for. */
export function useNimiqTag(provider: Eip1193, address: Address) {
  const [tag, setTag] = useState<string | null>();

  useEffect(() => {
    const controller = new AbortController();
    nimiqApi
      .tagOf(address, { signal: controller.signal })
      .then((result) => setTag(result.tag))
      // Left unknown, so a failed read never offers a second claim.
      .catch(() => {});
    return () => controller.abort();
  }, [address]);

  const claim = useCallback(
    async (handle: string) => {
      const issuedAt = Math.floor(Date.now() / 1000);
      let signature: `0x${string}`;
      try {
        await ensurePolygon(provider).catch((error) => {
          if (isUserRejection(error)) throw error;
        });
        signature = await signTypedData(
          provider,
          address,
          serializeTagClaim({ wallet: address, handle, issuedAt }),
        );
      } catch (error) {
        throw new Error(
          isUserRejection(error)
            ? "You cancelled the signature."
            : "Nimiq Pay couldn't sign this. Try again.",
        );
      }
      const result = await nimiqApi.claimTag({
        address,
        tag: handle,
        issuedAt,
        signature,
      });
      setTag(result.tag);
    },
    [provider, address],
  );

  return { tag, claim };
}

export type TagMatch = { handle: string; tag: string; address: Address };

type TagLookup = { status: LookupStatus; match?: TagMatch };

/** Resolves a typed Jumpa tag to the Nimiq Pay wallet holding it; exact match only. */
export function useTagLookup(query: string): TagLookup {
  const handle = normaliseTag(query.trim().replace(/@jumpa$/i, ""));
  const [state, setState] = useState<TagLookup & { for: string }>({
    for: "",
    status: "idle",
  });

  useEffect(() => {
    if (handle.length < TAG_MIN_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await nimiqApi.tagStatus(handle, {
          signal: controller.signal,
        });
        setState(
          result.address
            ? {
                for: handle,
                status: "found",
                match: { handle, tag: result.tag, address: result.address },
              }
            : { for: handle, status: "none" },
        );
      } catch {
        if (!controller.signal.aborted) {
          setState({ for: handle, status: "error" });
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [handle]);

  // Derived, so an answer for an older handle never shows against a newer one.
  if (handle.length < TAG_MIN_LENGTH) return { status: "idle" };
  if (state.for !== handle) return { status: "searching" };
  return { status: state.status, match: state.match };
}
