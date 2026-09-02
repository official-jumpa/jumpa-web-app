"use client";

import { useState } from "react";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { CaptureScreen } from "@/components/kyc/capture-screen";
import { DocumentSheet } from "@/components/kyc/document-sheet";
import { KycIntro } from "@/components/kyc/kyc-intro";
import { KycTasks } from "@/components/kyc/kyc-tasks";
import { ScreenHeader } from "@/components/ui/screen-header";
import { KYC_DOCUMENTS, type KycDocument, type KycTask } from "@/lib/kyc";

type Stage = "intro" | "tasks" | "document" | "selfie";

/**
 * Identity verification end to end. One route with four stages, because the
 * checklist has to remember which captures are already done.
 */
export function KycView() {
  const [stage, setStage] = useState<Stage>("intro");
  const [done, setDone] = useState<KycTask[]>([]);
  const [document, setDocument] = useState<KycDocument>(KYC_DOCUMENTS[0]);
  const [pickingDocument, setPickingDocument] = useState(false);
  const [verified, setVerified] = useState(false);

  const complete = (task: KycTask) => {
    setDone((tasks) => (tasks.includes(task) ? tasks : [...tasks, task]));
    setStage("tasks");
  };

  const title = stage === "document" ? "Scan ID" : "KYC Verification";

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back="/home"
        title={title}
        round
        onBack={
          stage === "intro"
            ? undefined
            : () => setStage(stage === "tasks" ? "intro" : "tasks")
        }
      />

      {stage === "intro" ? (
        <KycIntro onStart={() => setStage("tasks")} />
      ) : null}

      {stage === "tasks" ? (
        <KycTasks
          done={done}
          onPick={(task) =>
            task === "document" ? setPickingDocument(true) : setStage("selfie")
          }
          onContinue={() => setVerified(true)}
        />
      ) : null}

      {stage === "document" ? (
        <CaptureScreen
          title={`Upload a Picture of your ${document.name}`}
          description={`Take a clear photo of your ${document.label}. Every corner has to be visible and the text readable.`}
          onDone={() => complete("document")}
        />
      ) : null}

      {stage === "selfie" ? (
        <CaptureScreen
          title="Take a Picture"
          description="A quick verification helps us keep your account secure and meet regulatory requirements."
          shape="oval"
          mode="camera"
          onDone={() => complete("selfie")}
        />
      ) : null}

      {pickingDocument ? (
        <DocumentSheet
          onClose={() => setPickingDocument(false)}
          onContinue={(picked) => {
            setDocument(picked);
            setPickingDocument(false);
            setStage("document");
          }}
        />
      ) : null}

      {verified ? (
        <SuccessSheet
          title="Verification successful"
          description="Your code has been verified successfully. You can now continue."
          actionHref="/home"
          actionLabel="Continue"
        />
      ) : null}
    </div>
  );
}
