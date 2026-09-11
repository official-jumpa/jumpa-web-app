"use client";

import { useEffect, useState } from "react";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { DocumentSheet } from "@/components/kyc/document-sheet";
import { KycCaptureScreen } from "@/components/kyc/kyc-capture-screen";
import { KycIntro } from "@/components/kyc/kyc-intro";
import { KycTasks } from "@/components/kyc/kyc-tasks";
import { ScreenHeader } from "@/components/ui/screen-header";
import { KYC_DOCUMENTS, type KycDocument, type KycTask } from "@/lib/kyc";

type Stage = "intro" | "tasks" | "document" | "selfie";

const DEFAULT_TEST_IDS: Record<string, string> = {
  nin: "00000000001",
  licence: "TST00000001",
  passport: "A00000001",
};

/**
 * Native Identity Verification using Myaza Direct API.
 * Preserves the 4-stage UI flow while executing authenticated server calls
 * backed by KYCSchema.
 */
export function KycView() {
  const [stage, setStage] = useState<Stage>("intro");
  const [done, setDone] = useState<KycTask[]>([]);
  const [document, setDocument] = useState<KycDocument>(KYC_DOCUMENTS[0]);
  const [pickingDocument, setPickingDocument] = useState(false);
  const [verified, setVerified] = useState(false);

  // Captured data for KYC API
  const [docIdNumber, setDocIdNumber] = useState<string>(DEFAULT_TEST_IDS.nin);
  const [docMediaId, setDocMediaId] = useState<string | null>(null);
  const [selfieMediaId, setSelfieMediaId] = useState<string | null>(null);

  // API Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastVerificationId, setLastVerificationId] = useState<string | null>(
    null,
  );

  // Sync existing user KYC status on initial mount
  useEffect(() => {
    let isMounted = true;
    async function loadUserKycStatus() {
      try {
        const res = await fetch("/api/kyc");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.isCompleted) {
          setVerified(true);
          if (data.verificationId) setLastVerificationId(data.verificationId);
          return;
        }

        const restoredTasks: KycTask[] = [];
        if (data.docMediaId || data.stepsCompleted?.document) {
          setDocMediaId(data.docMediaId);
          restoredTasks.push("document");
        }
        if (data.selfieMediaId || data.stepsCompleted?.selfie) {
          setSelfieMediaId(data.selfieMediaId);
          restoredTasks.push("selfie");
        }
        if (data.idNumber) {
          setDocIdNumber(data.idNumber);
        }
        if (restoredTasks.length > 0) {
          setDone(restoredTasks);
        }
      } catch (err) {
        console.warn("[KycView] Could not load initial KYC status:", err);
      }
    }

    loadUserKycStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const completeDocumentTask = (data: {
    file?: File;
    idNumber?: string;
    mediaId?: string;
  }) => {
    if (data.idNumber) {
      setDocIdNumber(data.idNumber);
    }
    if (data.mediaId) {
      setDocMediaId(data.mediaId);
    }
    setDone((tasks) =>
      tasks.includes("document") ? tasks : [...tasks, "document"],
    );
    setStage("tasks");
  };

  const completeSelfieTask = (data: { file?: File; mediaId?: string }) => {
    if (data.mediaId) {
      setSelfieMediaId(data.mediaId);
    }
    setDone((tasks) =>
      tasks.includes("selfie") ? tasks : [...tasks, "selfie"],
    );
    setStage("tasks");
  };

  const handleExecuteVerification = async () => {
    setIsSubmitting(true);
    setApiError(null);

    const finalIdNumber =
      docIdNumber.trim() || DEFAULT_TEST_IDS[document.id] || "00000000001";

    const payload = {
      idType: document.id,
      idNumber: finalIdNumber,
      docMediaId,
      selfieMediaId,
    };

    try {
      console.log("[KYC View] Submitting to /api/kyc/verify:", payload);
      const res = await fetch("/api/kyc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (res.ok && (data.success || data.status === "approved")) {
        if (data.verificationId) {
          setLastVerificationId(String(data.verificationId));
        }
        setVerified(true);
      } else if (res.status === 401) {
        setApiError("Authentication required. Please log in to complete KYC.");
      } else if (res.status === 422) {
        const errorMsg =
          typeof data.error === "string"
            ? data.error
            : "Verification failed. Please verify that your document number matches test IDs.";
        setApiError(errorMsg);
      } else {
        const errorMsg =
          typeof data.message === "string"
            ? data.message
            : typeof data.error === "string"
              ? data.error
              : `Verification failed with HTTP ${res.status}`;
        setApiError(errorMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setApiError(`Network failure: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = stage === "document" ? "Scan ID" : "KYC Verification";

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] bg-jumpa-white text-jumpa-black max-w-app mx-auto w-full">
      {/* Screen Header */}
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

      {/* Stage 1: Intro */}
      {stage === "intro" ? (
        <KycIntro onStart={() => setStage("tasks")} />
      ) : null}

      {/* Stage 2: Tasks Checklist */}
      {stage === "tasks" ? (
        <KycTasks
          done={done}
          document={document}
          idNumber={docIdNumber}
          hasSelfie={Boolean(selfieMediaId || done.includes("selfie"))}
          isSubmitting={isSubmitting}
          apiError={apiError}
          onPick={(task) =>
            task === "document" ? setPickingDocument(true) : setStage("selfie")
          }
          onContinue={handleExecuteVerification}
        />
      ) : null}

      {/* Stage 3: Document Capture */}
      {stage === "document" ? (
        <KycCaptureScreen
          title={`Upload a Picture of your ${document.name}`}
          description={`Take a clear photo of your ${document.label}. Every corner should be visible and the text readable`}
          documentType={document.id}
          defaultIdNumber={docIdNumber || DEFAULT_TEST_IDS[document.id]}
          initialMediaId={docMediaId || undefined}
          onDone={completeDocumentTask}
        />
      ) : null}

      {/* Stage 4: Selfie Capture */}
      {stage === "selfie" ? (
        <KycCaptureScreen
          title="Take a Picture"
          description="A quick verification helps us keep your account secure and meet regulatory requirements"
          shape="oval"
          mode="camera"
          initialMediaId={selfieMediaId || undefined}
          onDone={completeSelfieTask}
        />
      ) : null}

      {/* Document Selection Bottom Sheet */}
      {pickingDocument ? (
        <DocumentSheet
          onClose={() => setPickingDocument(false)}
          onContinue={(picked) => {
            setDocument(picked);
            setDocIdNumber(DEFAULT_TEST_IDS[picked.id] || "00000000001");
            setPickingDocument(false);
            setStage("document");
          }}
        />
      ) : null}

      {/* Verification Success Sheet */}
      {verified ? (
        <SuccessSheet
          title="Verification successful"
          description={
            lastVerificationId
              ? "Your identity has been verified"
              : "Your identity has been verified successfully."
          }
          actionHref="/home"
          actionLabel="Continue"
        />
      ) : null}
    </div>
  );
}
