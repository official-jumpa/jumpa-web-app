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

/**
 * Native Identity Verification using Myaza Direct API.
 * Preserves the 4-stage UI flow while executing authenticated server calls
 * backed by KYCSchema.
 */
export interface InitialKycData {
  isCompleted?: boolean;
  status?: string | null;
  verificationId?: string | null;
  docMediaId?: string | null;
  selfieMediaId?: string | null;
  idNumber?: string | null;
  rejectionReason?: string | null;
  stepsCompleted?: { document?: boolean; selfie?: boolean; verification?: boolean };
}

export function KycView({
  initialKycData,
}: {
  initialKycData?: InitialKycData | null;
}) {
  const isDev = process.env.NODE_ENV !== "production";

  const isFailedInitial =
    initialKycData?.status === "failed" || initialKycData?.status === "rejected";

  const initialTasks: KycTask[] = [];
  if (!isFailedInitial) {
    if (initialKycData?.docMediaId || initialKycData?.stepsCompleted?.document) {
      initialTasks.push("document");
    }
    if (initialKycData?.selfieMediaId || initialKycData?.stepsCompleted?.selfie) {
      initialTasks.push("selfie");
    }
  }

  // If user already has draft progress or pending verification, jump directly to tasks
  const hasDraftOrPending =
    initialTasks.length > 0 ||
    initialKycData?.status === "pending" ||
    (initialKycData?.status === "in_progress" && Boolean(initialKycData?.verificationId));

  const [stage, setStage] = useState<Stage>(hasDraftOrPending ? "tasks" : "intro");
  const [done, setDone] = useState<KycTask[]>(initialTasks);
  const [document, setDocument] = useState<KycDocument>(KYC_DOCUMENTS[0]);
  const [pickingDocument, setPickingDocument] = useState(false);
  const [verified, setVerified] = useState(Boolean(initialKycData?.isCompleted));

  // Pending / processing state
  const [isPendingVerification, setIsPendingVerification] = useState<boolean>(
    Boolean(
      initialKycData?.status === "pending" ||
        (initialKycData?.status === "in_progress" && Boolean(initialKycData?.verificationId)),
    ),
  );

  // Captured data for KYC API
  const [docIdNumber, setDocIdNumber] = useState<string>(
    initialKycData?.idNumber || "",
  );
  const [docMediaId, setDocMediaId] = useState<string | null>(
    isFailedInitial ? null : (initialKycData?.docMediaId ?? null),
  );
  const [selfieMediaId, setSelfieMediaId] = useState<string | null>(
    isFailedInitial ? null : (initialKycData?.selfieMediaId ?? null),
  );

  // API Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(
    isFailedInitial && initialKycData?.rejectionReason
      ? initialKycData.rejectionReason
      : null,
  );
  const [lastVerificationId, setLastVerificationId] = useState<string | null>(
    initialKycData?.verificationId ?? null,
  );

  // Sync existing user KYC status on initial mount if not provided by server
  useEffect(() => {
    if (initialKycData !== undefined) return;

    let isMounted = true;
    async function loadUserKycStatus() {
      try {
        const res = await fetch("/api/kyc");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.isCompleted || data.status === "approved") {
          setVerified(true);
          if (data.verificationId) setLastVerificationId(data.verificationId);
          return;
        }

        if (data.status === "failed" || data.status === "rejected") {
          setApiError(
            data.rejectionReason ||
              "Your previous verification could not be approved. Please upload your documents again to retry.",
          );
          setDone([]);
          setDocMediaId(null);
          setSelfieMediaId(null);
          setStage("tasks");
          return;
        }

        if (data.status === "pending") {
          setIsPendingVerification(true);
          if (data.verificationId) setLastVerificationId(data.verificationId);
          setStage("tasks");
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
          setStage("tasks");
        }
      } catch (err) {
        console.warn("[KycView] Could not load initial KYC status:", err);
      }
    }

    loadUserKycStatus();
    return () => {
      isMounted = false;
    };
  }, [initialKycData]);

  // Polling for async verification completion
  useEffect(() => {
    if (!isPendingVerification) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/kyc");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.isCompleted || data.status === "approved") {
          setIsPendingVerification(false);
          setVerified(true);
          if (data.verificationId) setLastVerificationId(data.verificationId);
          clearInterval(interval);
        } else if (data.status === "failed" || data.status === "rejected") {
          setIsPendingVerification(false);
          setApiError(
            data.rejectionReason ||
              "Identity verification could not be approved. Please try again.",
          );
          clearInterval(interval);
        }
      } catch (err) {
        console.warn("[KycView] Polling check failed:", err);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isPendingVerification]);

  const handleManualCheckStatus = async () => {
    try {
      const res = await fetch("/api/kyc");
      if (!res.ok) return;
      const data = await res.json();
      if (data.isCompleted || data.status === "approved") {
        setIsPendingVerification(false);
        setVerified(true);
        if (data.verificationId) setLastVerificationId(data.verificationId);
      } else if (data.status === "failed" || data.status === "rejected") {
        setIsPendingVerification(false);
        setApiError(
          data.rejectionReason ||
            "Identity verification was rejected. Please review your documents and retry.",
        );
      }
    } catch (err) {
      console.warn("[KycView] Manual check failed:", err);
    }
  };

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
    if (!docMediaId) {
      setApiError("Please upload your ID document before continuing.");
      return;
    }
    if (!selfieMediaId) {
      setApiError("Please capture your live selfie before continuing.");
      return;
    }

    const finalIdNumber = docIdNumber.trim();
    if (!finalIdNumber) {
      setApiError("Please provide your ID document number.");
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

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
        if (data.status === "pending") {
          setIsPendingVerification(true);
        } else {
          setVerified(true);
        }
      } else if (res.status === 401) {
        setApiError("Authentication required. Please log in to complete KYC.");
      } else if (res.status === 422) {
        const errorMsg =
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
              ? data.message
              : "Verification failed. Please ensure your document number matches your ID exactly.";
        setApiError(errorMsg);
      } else if (res.status >= 500) {
        const errorMsg =
          typeof data.error === "string" && !data.error.includes("Internal")
            ? data.error
            : "The verification service is momentarily busy. Please try submitting again in a moment.";
        setApiError(errorMsg);
      } else {
        const errorMsg =
          typeof data.message === "string"
            ? data.message
            : typeof data.error === "string"
              ? data.error
              : "Verification could not be completed. Please try again.";
        setApiError(errorMsg);
      }
    } catch (err) {
      console.error("[KYC View] Submission network error:", err);
      setApiError("Unable to reach the verification service. Please check your internet connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = stage === "document" ? "Scan ID" : "KYC Verification";

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] bg-jumpa-white text-jumpa-black max-w-app mx-auto w-full">
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
          isPendingVerification={isPendingVerification}
          apiError={apiError}
          onPick={(task) =>
            task === "document" ? setPickingDocument(true) : setStage("selfie")
          }
          onContinue={handleExecuteVerification}
          onCheckStatus={handleManualCheckStatus}
        />
      ) : null}

      {/* Stage 3: Document Capture */}
      {stage === "document" ? (
        <KycCaptureScreen
          title={`Upload a Picture of your ${document.name}`}
          description={`Take a clear photo of your ${document.label}. Every corner should be visible and the text readable`}
          documentType={document.id}
          defaultIdNumber={docIdNumber || ""}
          initialMediaId={docMediaId || undefined}
          onDone={completeDocumentTask}
        />
      ) : null}

      {/* Stage 4: Selfie Capture */}
      {stage === "selfie" ? (
        <KycCaptureScreen
          title="Take a Live Selfie"
          description="A quick selfie verification helps us confirm your identity and meet regulatory requirements"
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

