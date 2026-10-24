"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { DocumentSheet } from "@/components/kyc/document-sheet";
import { KycCaptureScreen } from "@/components/kyc/kyc-capture-screen";
import { KycIntro } from "@/components/kyc/kyc-intro";
import { KycTasks } from "@/components/kyc/kyc-tasks";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { LeaveConfirmSheet } from "@/components/kyc/leave-confirm-sheet";
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
    if (initialKycData?.docMediaId) {
      initialTasks.push("document");
    }
    if (initialKycData?.selfieMediaId) {
      initialTasks.push("selfie");
    }
  }

  // If user already has draft progress or pending verification, jump directly to tasks
  const hasDraftOrPending =
    initialTasks.length > 0 ||
    initialKycData?.status === "pending" ||
    (initialKycData?.status === "in_progress" && Boolean(initialKycData?.verificationId));

  const router = useRouter();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
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
  // Submission loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cooldown timer (30s) before fetching status from provider
  const [pendingCooldownSeconds, setPendingCooldownSeconds] = useState<number>(
    initialKycData?.status === "pending" ? 30 : 0,
  );

  // Tick cooldown down every second
  useEffect(() => {
    if (pendingCooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setPendingCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [pendingCooldownSeconds]);

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
  // Kept so reopening the selfie or document step shows the photo in state (never persisted in DB for data minimization)
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  // User is actively in the capture flow with unsubmitted draft work.
  // Strictly false if verification has already been submitted (pending/processing), submitting, or verified.
  const isKycStarted =
    stage !== "intro" &&
    !verified &&
    !isPendingVerification &&
    !isSubmitting;

  useEffect(() => {
    return () => {
      if (docPreview) URL.revokeObjectURL(docPreview);
    };
  }, [docPreview]);

  useEffect(() => {
    return () => {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview]);

  // Display browser warning dialog if user attempts to reload page or close tab while actively in KYC capture
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isKycStarted) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isKycStarted]);

  // Handle hardware / browser back button to trigger our styled confirmation popup only while in active capture
  useEffect(() => {
    if (!isKycStarted) return;

    window.history.pushState({ kycInProgress: true }, "");

    const handlePopState = () => {
      window.history.pushState({ kycInProgress: true }, "");
      setShowLeaveConfirm(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isKycStarted]);

  const handleBackClick = () => {
    // If verification has already been submitted (pending or verified), navigate freely back without warnings
    if (isPendingVerification || verified) {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/home");
      }
      return;
    }

    // If user has an in-progress unsubmitted capture, trigger the confirmation modal
    if (isKycStarted) {
      setShowLeaveConfirm(true);
      return;
    }

    // From intro screen (or tasks before starting), navigate to previous page or fallback to /home
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    if (docPreview) URL.revokeObjectURL(docPreview);
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setDocPreview(null);
    setSelfiePreview(null);
    setDocIdNumber("");
    setDocMediaId(null);
    setSelfieMediaId(null);
    setDone([]);

    // Clear saved media IDs from database so user starts completely from scratch
    fetch("/api/v1/kyc", { method: "DELETE" }).catch((err) => {
      console.warn("[KYC] Failed to clear draft media IDs:", err);
    });

    // Redirect to the KYC home page (intro) instead of the main dashboard
    setStage("intro");
  };

  // API Submission state
  const [apiError, setApiError] = useState<string | null>(
    isFailedInitial && initialKycData?.rejectionReason
      ? initialKycData.rejectionReason
      : null,
  );
  const [lastVerificationId, setLastVerificationId] = useState<string | null>(
    initialKycData?.verificationId ?? null,
  );

  // Polling strictly when verification is pending and the 30s cooldown has expired
  useEffect(() => {
    if (!isPendingVerification || pendingCooldownSeconds > 0) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/v1/kyc");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.isCompleted || data.status === "approved" || data.status === "verified") {
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
  }, [isPendingVerification, pendingCooldownSeconds]);

  const handleManualCheckStatus = async () => {
    if (pendingCooldownSeconds > 0) return;
    try {
      const res = await fetch("/api/v1/kyc");
      if (!res.ok) return;
      const data = await res.json();
      if (data.isCompleted || data.status === "approved" || data.status === "verified") {
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
    if (data.file) {
      if (docPreview) URL.revokeObjectURL(docPreview);
      setDocPreview(URL.createObjectURL(data.file));
    }
    setDone((tasks) =>
      tasks.includes("document") ? tasks : [...tasks, "document"],
    );
    // User is bound to this document; advance immediately to selfie capture
    setStage("selfie");
  };

  const handleExecuteVerification = async (overrideSelfieId?: string) => {
    const activeSelfieId = overrideSelfieId || selfieMediaId;
    const finalIdNumber = docIdNumber.trim();
    if (!finalIdNumber) {
      setApiError("Please enter your official document ID number before you continue.");
      setStage("document");
      return;
    }
    if (document.id !== "nin" && !docMediaId) {
      setApiError("Please upload a photo of your document before you continue.");
      setStage("document");
      return;
    }
    if (!activeSelfieId) {
      setApiError("Please capture your live selfie before you continue.");
      setStage("selfie");
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    let succeeded = false;

    const payload = {
      idType: document.id,
      idNumber: finalIdNumber,
      docMediaId: docMediaId || undefined,
      selfieMediaId: activeSelfieId,
    };

    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 1500));
      const [res] = await Promise.all([
        fetch("/api/v1/kyc/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        minDelay,
      ]);

      const data = (await res.json()) as Record<string, unknown>;

      if (res.ok && (data.success || data.status === "approved" || data.status === "verified" || data.status === "pending")) {
        succeeded = true;
        setShowLeaveConfirm(false);
        if (data.verificationId) {
          setLastVerificationId(String(data.verificationId));
        }
        if (data.status === "pending" || !data.isCompleted) {
          setIsPendingVerification(true);
          setPendingCooldownSeconds(30);
        } else {
          setVerified(true);
        }
      } else {
        const errorMsg =
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
              ? data.message
              : "Verification could not be completed. Please try again.";
        console.error("[KycView] Verification failed with response:", {
          status: res.status,
          statusText: res.statusText,
          data,
        });
        setApiError(errorMsg);
      }
    } catch (err) {
      console.error("[KYC View] Submission network error:", err);
      setApiError("Unable to reach the verification service. Please try again later.");
    } finally {
      if (!succeeded) {
        setSelfieMediaId(null);
        setSelfiePreview(null);
        setDone((tasks) => tasks.filter((task) => task !== "selfie"));
      }
      setIsSubmitting(false);
    }
  };

  const completeSelfieTask = async (data: { file?: File; mediaId?: string }) => {
    const selfieId = data.mediaId || selfieMediaId;
    if (data.mediaId) {
      setSelfieMediaId(data.mediaId);
    }
    if (data.file) {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      setSelfiePreview(URL.createObjectURL(data.file));
    }
    setDone((tasks) =>
      tasks.includes("selfie") ? tasks : [...tasks, "selfie"],
    );

    // Once selfie is captured, instantly submit verification without bouncing back to start
    setStage("tasks");
    if (selfieId) {
      await handleExecuteVerification(selfieId);
    }
  };

  const title =
    stage === "document"
      ? "Enter ID"
      : stage === "selfie"
        ? "Take Selfie"
        : "KYC Verification";

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] bg-jumpa-white text-jumpa-black max-w-app mx-auto w-full">
      {/* Screen Header */}
      <ScreenHeader
        back="/home"
        title={title}
        round
        onBack={handleBackClick}
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
          pendingCooldownSeconds={pendingCooldownSeconds}
          apiError={apiError}
          onStartVerification={() => setPickingDocument(true)}
          onContinue={() => handleExecuteVerification()}
          onCheckStatus={handleManualCheckStatus}
        />
      ) : null}

      {/* Stage 3: Document Capture */}
      {stage === "document" ? (
        <KycCaptureScreen
          title={
            document.id === "nin"
              ? "Provide your NIN Number"
              : `Provide your ${document.name}`
          }
          description={
            document.id === "nin"
              ? "Enter your 11-digit NIN to verify your identity"
              : `Enter your ${document.label} number and upload a clear photo of your document`
          }
          documentType={document.id}
          defaultIdNumber={docIdNumber || ""}
          initialMediaId={docMediaId || undefined}
          initialPreview={docPreview || undefined}
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
          initialPreview={selfiePreview || undefined}
          isSubmitting={isSubmitting}
          onDone={completeSelfieTask}
        />
      ) : null}

      {/* Document Selection Bottom Sheet */}
      {pickingDocument ? (
        <DocumentSheet
          onClose={() => setPickingDocument(false)}
          onContinue={(picked) => {
            if (picked.id !== document.id) {
              setDocument(picked);
              setDocIdNumber("");
              setDocMediaId(null);
              if (docPreview) URL.revokeObjectURL(docPreview);
              setDocPreview(null);
              setDone((tasks) => tasks.filter((t) => t !== "document"));
            }
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

      {/* Leave Confirmation Sheet - only when user has active unsubmitted draft capture */}
      {showLeaveConfirm && !isPendingVerification && !verified && !isSubmitting ? (
        <LeaveConfirmSheet
          onKeepGoing={() => setShowLeaveConfirm(false)}
          onLeave={handleConfirmLeave}
        />
      ) : null}

      {/* Submitting Verification Loader Overlay (min 1.5s) */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-app flex-col items-center justify-center bg-jumpa-white/90 backdrop-blur-sm px-4.5 animate-fade">
          <JumpaLoader
            label="Submitting verification"
            className="size-28"
          />
          <p className="mt-4 text-sm font-semibold text-jumpa-black animate-pulse">
            Submitting verification...
          </p>
          <span className="mt-1 text-xs text-jumpa-neutral-400">
            Please wait while we verify your details
          </span>
        </div>
      )}
    </div>
  );
}

