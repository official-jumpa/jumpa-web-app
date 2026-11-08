"use client";

import { useState } from "react";
import type { Address } from "viem";
import { type NimiqApiError, nimiqApi } from "@/lib/nimiq/api-client";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import {
  type Eip1193,
  ensurePolygon,
  isUserRejection,
  signTypedData,
} from "@/lib/nimiq/provider";

export type CheckoutStep = "preparing" | "signing" | "sending";

/** An order the server opened, with the permit Nimiq Pay signs for it. */
export type PermitDraft = { order: PublicOrder; typedData: string };

export type CheckoutFailure = { message: string; retry?: () => void };

/**
 * Opens an order, has Nimiq Pay sign its permit, then submits the signature,
 * with the retries a lost reply or a paused relayer needs.
 */
export function usePermitCheckout({
  provider,
  address,
  noun,
  submit,
  onDone,
  onExpired,
}: {
  provider: Eip1193;
  address: Address;
  /** Names the payment in copy: "cash-out", "purchase". */
  noun: string;
  submit: (
    orderId: string,
    signature: string,
  ) => Promise<{ order: PublicOrder }>;
  onDone: (order: PublicOrder) => void;
  /** The prepared order can no longer be signed. */
  onExpired?: () => void;
}) {
  const [step, setStep] = useState<CheckoutStep>();
  const [failure, setFailure] = useState<CheckoutFailure>();
  const [notice, setNotice] = useState<string>();

  const send = async (orderId: string, signature: string) => {
    setStep("sending");
    try {
      onDone((await submit(orderId, signature)).order);
    } catch (error) {
      const refusal = error as NimiqApiError;
      // 409: an earlier attempt already went through (e.g. the reply was lost); show it.
      if (refusal.status === 409) {
        const found = await nimiqApi.order(orderId).catch(() => undefined);
        if (found) return onDone(found.order);
      }
      // 503: the relayer paused before sending; 0: the reply never came. Same signature again.
      const retry =
        refusal.status === 503 || refusal.status === 0
          ? () => {
              setFailure(undefined);
              void send(orderId, signature);
            }
          : undefined;
      if (refusal.status === 410) onExpired?.();
      setFailure({ message: refusal.message, retry });
    } finally {
      setStep(undefined);
    }
  };

  const run = async (prepare: () => Promise<PermitDraft>) => {
    setNotice(undefined);
    setStep("preparing");
    let prepared: PermitDraft;
    try {
      prepared = await prepare();
    } catch (error) {
      setStep(undefined);
      const status = (error as NimiqApiError).status ?? 0;
      setFailure({
        message: (error as Error).message,
        retry:
          status === 0 || status >= 500
            ? () => {
                setFailure(undefined);
                void run(prepare);
              }
            : undefined,
      });
      return;
    }

    setStep("signing");
    let signature: string;
    try {
      // The permit has no chainId, so a wallet that can't switch can still sign it.
      await ensurePolygon(provider).catch((error) => {
        if (isUserRejection(error)) throw error;
      });
      signature = await signTypedData(provider, address, prepared.typedData);
    } catch (error) {
      setStep(undefined);
      setNotice(
        isUserRejection(error)
          ? "You cancelled the signature."
          : `Nimiq Pay couldn't sign this ${noun}. Try again.`,
      );
      return;
    }
    await send(prepared.order.id, signature);
  };

  return {
    step,
    failure,
    /** Shown inside the review sheet: a cancelled or failed signature. */
    notice,
    run,
    clearNotice: () => setNotice(undefined),
    dismissFailure: () => setFailure(undefined),
  };
}
