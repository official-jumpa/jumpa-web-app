"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { CodeStep } from "@/components/settings/pin-flow/code-step";
import {
  IDENTITY_COPY,
  IdentityStep,
} from "@/components/settings/pin-flow/identity-step";
import { PinStage } from "@/components/settings/pin-flow/pin-stage";
import { PinStep } from "@/components/settings/pin-flow/pin-step";
import { settingsHref } from "@/components/settings/sections";
import { Button } from "@/components/ui/button";
import {
  PIN_FLOWS,
  type PinFlowName,
  RESET_CODE_LENGTH,
} from "@/lib/pin-flows";

/**
 * `change` runs current -> create -> confirm; `forgot` swaps the first step for
 * intro -> identity -> code. Both end on the same success sheet.
 */
type Stage =
  | "intro"
  | "identity"
  | "code"
  | "current"
  | "create"
  | "confirm"
  | "done";

/** The step behind each one, so the header can walk back without history. */
const PREVIOUS: Partial<Record<Stage, Stage>> = {
  identity: "intro",
  code: "identity",
  confirm: "create",
};

const BACK = settingsHref("security");

/**
 * Every PIN screen under Settings: changing the login or transaction PIN, and
 * resetting either after a reset code. The steps share one URL, so the header
 * steps back through `PREVIOUS` and leaving the first step exits to Security.
 */
export function PinFlow({ name }: { name: PinFlowName }) {
  const flow = PIN_FLOWS[name];
  const router = useRouter();

  const [stage, setStage] = useState<Stage>(
    flow.mode === "forgot" ? "intro" : "current",
  );
  const [contact, setContact] = useState("");
  const [created, setCreated] = useState("");
  const [error, setError] = useState<string>();

  const clearError = useCallback(() => setError(undefined), []);

  const goBack = () => {
    const previous = PREVIOUS[stage];
    clearError();
    if (previous) setStage(previous);
    else router.push(BACK);
  };

  const step = useCallback(
    (next: Stage) => {
      clearError();
      setStage(next);
    },
    [clearError],
  );

  /**
   * These screens draw the design's slot count, which is not the length the
   * wallet's stored PIN has — so nothing here is checked against it, and
   * nothing is persisted. Verify the current PIN once a change endpoint exists.
   */
  const checkCurrent = useCallback(() => step("create"), [step]);

  const confirmCreated = useCallback(
    (pin: string) => {
      if (pin !== created) {
        setError("Those PINs do not match. Enter the new PIN again.");
        return;
      }
      step("done");
    },
    [created, step],
  );

  const title = flow.title;

  if (stage === "intro" && flow.intro) {
    return (
      <PinStage
        title={title}
        heading={flow.intro.heading}
        description={flow.intro.description}
        onBack={goBack}
        footer={
          <Button variant="gradient" size="lg" onClick={() => step("identity")}>
            Continue
          </Button>
        }
      />
    );
  }

  if (stage === "identity") {
    return (
      <PinStage
        title={title}
        heading={IDENTITY_COPY.heading}
        description={IDENTITY_COPY.description}
        onBack={goBack}
      >
        <IdentityStep
          value={contact}
          onSend={(next) => {
            setContact(next);
            step("code");
          }}
        />
      </PinStage>
    );
  }

  if (stage === "code") {
    return (
      <PinStage
        title={title}
        heading="Enter Verification Code"
        description={`A ${RESET_CODE_LENGTH}-digit code has been sent to ${contact}`}
        onBack={goBack}
      >
        <CodeStep
          contact={contact}
          error={error}
          onEdit={clearError}
          onResend={clearError}
          onSubmit={() => step("create")}
        />
      </PinStage>
    );
  }

  if (stage === "current" && flow.current) {
    return (
      <PinStage
        title={title}
        heading={flow.current.heading}
        description={flow.current.description}
        onBack={goBack}
      >
        <PinStep
          key="current"
          label={flow.current.label}
          length={flow.length}
          note={flow.note}
          error={error}
          onEdit={clearError}
          onSubmit={checkCurrent}
        />
      </PinStage>
    );
  }

  if (stage === "create") {
    return (
      <PinStage
        title={title}
        heading={flow.create.heading}
        description={flow.create.description}
        onBack={goBack}
      >
        <PinStep
          key="create"
          label={flow.create.label}
          length={flow.length}
          note={flow.note}
          onSubmit={(pin) => {
            setCreated(pin);
            step("confirm");
          }}
        />
      </PinStage>
    );
  }

  if (stage === "confirm") {
    return (
      <PinStage
        title={title}
        heading={flow.confirm.heading}
        description={flow.confirm.description}
        onBack={goBack}
      >
        <PinStep
          key="confirm"
          label={flow.confirm.label}
          length={flow.length}
          note={flow.note}
          error={error}
          onEdit={clearError}
          onSubmit={confirmCreated}
        />
      </PinStage>
    );
  }

  return (
    <>
      <PinStage
        title={title}
        heading={flow.confirm.heading}
        description={flow.confirm.description}
        onBack={goBack}
      />
      <SuccessSheet
        title={flow.success.title}
        description={flow.success.description}
        actionHref={BACK}
        actionLabel="Done"
      />
    </>
  );
}
