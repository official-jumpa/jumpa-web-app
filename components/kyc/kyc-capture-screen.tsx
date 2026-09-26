"use client";

import {
  type ComponentType,
  type SVGProps,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { CameraIcon } from "@/components/ui/icons/camera";
import { CheckIcon } from "@/components/ui/icons/check";
import { CloudIcon } from "@/components/ui/icons/cloud";
import { EyeIcon } from "@/components/ui/icons/eye";
import { ImageIcon } from "@/components/ui/icons/image";
import { RefreshIcon } from "@/components/ui/icons/refresh";
import { ScanIcon } from "@/components/ui/icons/scan";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";

// Suppress internal MediaPipe / TFLite C++ Emscripten stdout diagnostic logs in dev mode
if (typeof window !== "undefined") {
  const origInfo = console.info;
  const origWarn = console.warn;
  console.info = (...args: any[]) => {
    const str = typeof args[0] === "string" ? args[0] : "";
    if (str.includes("TensorFlow Lite") || str.includes("XNNPACK")) return;
    origInfo.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    const str = typeof args[0] === "string" ? args[0] : "";
    if (
      str.includes("face_landmarker_graph.cc") ||
      str.includes("gl_context.cc") ||
      str.includes("xnnpack")
    ) {
      return;
    }
    origWarn.apply(console, args);
  };
}

/** Rectangle for a document, portrait oval for a face. */
/**
 * The capture frame, per shape. The oval takes the column's leftover height
 * rather than a fixed one — capped, so it eases down on a short screen instead
 * of growing the document, and floored so it never collapses.
 */
const FRAME = {
  box: {
    wrap: "relative mt-5",
    frame:
      "w-full h-48 shrink-0 rounded-surface bg-jumpa-neutral-50 border border-jumpa-neutral-100",
  },
  oval: {
    wrap: "relative mt-5 flex min-h-0 flex-1 items-center justify-center",
    frame:
      "aspect-[4/5] h-full min-h-50 max-h-[min(48dvh,446px)] rounded-[50%] border-2 bg-jumpa-neutral-95 overflow-hidden relative transition-[border-color,box-shadow] duration-300",
  },
} as const;

type LivenessStage =
  | "align"
  | "cooldown"
  | "blink"
  | "turn"
  | "hold"
  | "verified";

type Tone = keyof typeof TONE;

/**
 * How a frame state is painted. Every surface that reacts to the liveness check
 * — the oval's border, its halo, the status pill — reads one entry, so they
 * cannot end up describing different states.
 */
const TONE = {
  rest: {
    ring: "border-dashed border-jumpa-neutral-200",
    halo: "",
    pill: "bg-jumpa-neutral-50 text-jumpa-neutral-500",
  },
  idle: {
    ring: "border-jumpa-primary-200",
    halo: "shadow-jumpa-halo-idle",
    pill: "bg-jumpa-primary-50 text-jumpa-primary-600",
  },
  active: {
    ring: "border-jumpa-warning",
    halo: "shadow-jumpa-halo-active",
    pill: "bg-jumpa-warning-50 text-jumpa-warning",
  },
  good: {
    ring: "border-jumpa-success",
    halo: "shadow-jumpa-halo-good",
    pill: "bg-jumpa-success/10 text-jumpa-success",
  },
  danger: {
    ring: "border-jumpa-danger",
    halo: "",
    pill: "bg-jumpa-danger-50 text-jumpa-danger",
  },
} as const;

/** The rail under the oval. `verified` sits past the end, so all four fill. */
const LIVENESS_STEPS = ["Align", "Blink", "Turn", "Hold"] as const;

/**
 * One entry per step of the check. Adding a step is an entry here plus a rail
 * label — not an edit in three places that can drift apart.
 */
const STAGE: Record<
  LivenessStage,
  {
    tone: Tone;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    /** Omitted where the detector writes its own line as the face moves. */
    label?: string;
    cta: string;
    /** Index on the rail; cooldown holds the step it has just left. */
    step: number;
  }
> = {
  align: { tone: "idle", Icon: ScanIcon, cta: "Center your face", step: 0 },
  cooldown: { tone: "good", Icon: CheckIcon, cta: "Nice — hold on", step: 0 },
  blink: {
    tone: "active",
    Icon: EyeIcon,
    label: "Blink your eyes",
    cta: "Blink to continue",
    step: 1,
  },
  turn: {
    tone: "active",
    Icon: RefreshIcon,
    label: "Turn your head slightly right",
    cta: "Turn your head",
    step: 2,
  },
  hold: { tone: "good", Icon: CameraIcon, cta: "Hold still\u2026", step: 3 },
  verified: {
    tone: "good",
    Icon: CheckIcon,
    label: "Liveness confirmed",
    cta: "Taking photo\u2026",
    step: LIVENESS_STEPS.length,
  },
};

function formatIdInput(val: string, docType?: string) {
  if (docType === "nin") {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return val.toUpperCase().trim();
}

// Cached MediaPipe Landmarker singleton to prevent re-downloads across re-renders
let landmarkerInstance: any = null;
let landmarkerLoadingPromise: Promise<any> | null = null;

async function getFaceLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;
  if (landmarkerLoadingPromise) return landmarkerLoadingPromise;

  landmarkerLoadingPromise = (async () => {
    try {
      const { FilesetResolver, FaceLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "CPU", // Explicitly use CPU delegate to prevent WebGL fallback logs
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });
      return landmarkerInstance;
    } catch (err) {
      console.warn("[MediaPipe Liveness] Could not load face landmarker:", err);
      return null;
    } finally {
      landmarkerLoadingPromise = null;
    }
  })();

  return landmarkerLoadingPromise;
}

export function KycCaptureScreen({
  title,
  description,
  shape = "box",
  mode: initialMode = "upload",
  documentType,
  defaultIdNumber,
  initialMediaId,
  onDone,
}: {
  title: string;
  description: string;
  shape?: keyof typeof FRAME;
  mode?: "upload" | "camera";
  documentType?: string;
  defaultIdNumber?: string;
  initialMediaId?: string;
  onDone: (data: { file?: File; idNumber?: string; mediaId?: string }) => void;
}) {
  const isSelfie = shape === "oval";
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [idNumber, setIdNumber] = useState(
    formatIdInput(defaultIdNumber || "", documentType),
  );

  // Live Camera Stream state for Selfie
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<
    "idle" | "requesting" | "ready" | "denied" | "unsupported"
  >("idle");

  // Client-Side Active Liveness State Machine
  // "align" -> "blink" -> "turn" -> "hold" -> "verified" (with 1s cooldown between transitions)
  const [livenessStage, setLivenessStage] = useState<LivenessStage>("align");

  const [alignmentFeedback, setAlignmentFeedback] = useState<string>(
    "Center your face in the oval",
  );
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [isFaceCentered, setIsFaceCentered] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100%
  const [showFlash, setShowFlash] = useState(false);

  // Refs for tracking frame sequences, movement velocity, and continuous 1s hold
  const animationFrameRef = useRef<number | null>(null);
  const steadyAlignFramesRef = useRef(0);
  const eyesClosedRef = useRef(false);
  const turnActionFramesRef = useRef(0);
  const holdStartTimeRef = useRef<number | null>(null);
  const prevFaceAnchorRef = useRef<{ x: number; y: number } | null>(null);

  // 1-second cooldown tracking refs
  const cooldownUntilRef = useRef<number>(0);
  const nextStageAfterCooldownRef = useRef<Exclude<
    LivenessStage,
    "cooldown"
  > | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(
    initialMediaId || null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount or preview reset
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState("idle");
  };

  // Start live WebRTC camera stream for selfie
  const startCamera = async () => {
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("requesting");
    stopCamera();

    try {
      const stream = await media.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraState("ready");
    } catch (err) {
      console.warn("[KycCapture] Camera permission denied:", err);
      setCameraState("denied");
    }
  };

  // Auto-start camera when entering selfie stage with no snapshot taken
  useEffect(() => {
    if (isSelfie && !preview && !uploadedMediaId) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isSelfie, preview, uploadedMediaId]);

  // Active Liveness Detection Loop (Strict Center -> 1s Continuous Steady Hold -> Immediate Crisp Capture)
  useEffect(() => {
    if (!isSelfie || preview || uploadedMediaId || cameraState !== "ready") {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let isCancelled = false;
    let landmarker: any = null;
    let currentStage: LivenessStage = "align";

    async function initAndRunLiveness() {
      landmarker = await getFaceLandmarker();
      if (isCancelled) return;

      currentStage = "align";
      setLivenessStage("align");
      setIsFaceCentered(false);
      setHoldProgress(0);
      setCooldownMessage(null);

      steadyAlignFramesRef.current = 0;
      eyesClosedRef.current = false;
      turnActionFramesRef.current = 0;
      holdStartTimeRef.current = null;
      prevFaceAnchorRef.current = null;
      cooldownUntilRef.current = 0;
      nextStageAfterCooldownRef.current = null;

      const processFrame = () => {
        if (isCancelled) return;
        const video = videoRef.current;

        if (video && video.readyState >= 2 && landmarker) {
          const nowInMs = performance.now();

          // 1-second Cooldown Gate between instructions
          if (currentStage === "cooldown") {
            if (nowInMs >= cooldownUntilRef.current) {
              const target = nextStageAfterCooldownRef.current || "align";
              currentStage = target;
              setLivenessStage(target);
              setCooldownMessage(null);
              nextStageAfterCooldownRef.current = null;
              if (target === "hold") {
                holdStartTimeRef.current = null;
                prevFaceAnchorRef.current = null;
              }
            }
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }

          try {
            const results = landmarker.detectForVideo(video, nowInMs);
            const landmarks = results?.faceLandmarks?.[0];
            const blendshapes = results?.faceBlendshapes?.[0]?.categories || [];

            if (landmarks && landmarks.length > 0) {
              // 1. Calculate Face Bounding Box & Scale
              let minX = 1;
              let maxX = 0;
              let minY = 1;
              let maxY = 0;
              for (let i = 0; i < landmarks.length; i++) {
                const pt = landmarks[i];
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
              }
              const faceWidth = maxX - minX;

              // 2. Map coordinates from video space to visible portrait oval space
              const vidW = video.videoWidth || 1280;
              const vidH = video.videoHeight || 720;
              const vidAspect = vidW / vidH;
              const targetAspect = 4 / 5; // Portrait oval aspect ratio (0.80)

              let visibleSpanX = 1;
              let visibleMinX = 0;
              if (vidAspect > targetAspect) {
                visibleSpanX = targetAspect / vidAspect;
                visibleMinX = (1 - visibleSpanX) / 2;
              }

              // 3. Physical Visual Face Center Anchor (Nose tip & Eye midpoint)
              const nose = landmarks[1] || landmarks[4];
              const leftEyeOuter = landmarks[33];
              const rightEyeOuter = landmarks[263];
              const leftCheek = landmarks[234];
              const rightCheek = landmarks[454];

              const eyeMidX =
                leftEyeOuter && rightEyeOuter
                  ? (leftEyeOuter.x + rightEyeOuter.x) / 2
                  : (minX + maxX) / 2;
              const eyeMidY =
                leftEyeOuter && rightEyeOuter
                  ? (leftEyeOuter.y + rightEyeOuter.y) / 2
                  : (minY + maxY) / 2;

              const faceAnchorRawX = nose
                ? nose.x * 0.65 + eyeMidX * 0.35
                : (minX + maxX) / 2;
              const faceAnchorRawY = nose
                ? nose.y * 0.55 + eyeMidY * 0.45
                : (minY + maxY) / 2;

              // In mirrored oval (-scale-x-100), user's screen coordinates [0, 1]:
              const visualFaceX =
                1 - (faceAnchorRawX - visibleMinX) / visibleSpanX;
              const visualFaceY = faceAnchorRawY;
              const faceWidthInOval = faceWidth / visibleSpanX;

              // Track physical movement velocity (are they holding still?)
              const movementDelta = prevFaceAnchorRef.current
                ? Math.hypot(
                    visualFaceX - prevFaceAnchorRef.current.x,
                    visualFaceY - prevFaceAnchorRef.current.y,
                  )
                : 0;
              prevFaceAnchorRef.current = { x: visualFaceX, y: visualFaceY };
              const isHoldingStill = movementDelta < 0.026;

              // 4. Head angles (tilt, yaw)
              const eyeTilt =
                leftEyeOuter && rightEyeOuter
                  ? Math.abs(leftEyeOuter.y - rightEyeOuter.y)
                  : 0;

              const cheekSpan =
                rightCheek && leftCheek
                  ? Math.abs(rightCheek.x - leftCheek.x)
                  : 0;
              const minCheek =
                rightCheek && leftCheek
                  ? Math.min(leftCheek.x, rightCheek.x)
                  : 0;
              const noseRel =
                nose && cheekSpan > 0.05
                  ? (nose.x - minCheek) / cheekSpan
                  : 0.5;

              // 5. Extract Blendshape Scores
              const getScore = (name: string) =>
                blendshapes.find((c: any) => c.categoryName === name)?.score ||
                0;
              const blinkLeft = getScore("eyeBlinkLeft");
              const blinkRight = getScore("eyeBlinkRight");
              const smileLeft = getScore("mouthSmileLeft");
              const smileRight = getScore("mouthSmileRight");
              const smileScore = Math.max(smileLeft, smileRight);

              // 6. Strict Radial Distance to Exact Oval Center
              // Target Center Point: visualFaceX = 0.50, visualFaceY = 0.46
              const dx = visualFaceX - 0.50;
              const dy = visualFaceY - 0.46;

              // Elliptical distance metric with tight center radius (horizontal ±0.08, vertical ±0.09)
              const distFromCenter = Math.sqrt(
                (dx / 0.08) ** 2 + (dy / 0.09) ** 2,
              );

              let alignMsg = "";
              let centered = true;

              if (faceWidthInOval < 0.36) {
                alignMsg = "Move closer to camera";
                centered = false;
              } else if (faceWidthInOval > 0.74) {
                alignMsg = "Move back slightly";
                centered = false;
              } else if (distFromCenter > 1.0) {
                if (dx < -0.06) {
                  alignMsg = "Move face right to center";
                } else if (dx > 0.06) {
                  alignMsg = "Move face left to center";
                } else if (dy < -0.07) {
                  alignMsg = "Move face down to center";
                } else if (dy > 0.07) {
                  alignMsg = "Move face up to center";
                } else {
                  alignMsg = "Place face in the center";
                }
                centered = false;
              } else if (eyeTilt > 0.05) {
                alignMsg = "Keep your head level";
                centered = false;
              } else if (Math.abs(noseRel - 0.5) > 0.12) {
                alignMsg = "Look directly at camera";
                centered = false;
              } else {
                alignMsg = "Face centered! Hold steady";
              }

              setAlignmentFeedback(alignMsg);
              setIsFaceCentered(centered);

              // 7. State Machine with Strict Centering, 1s Hold Still, & 1s Cooldowns
              if (currentStage === "align") {
                if (centered) {
                  steadyAlignFramesRef.current += 1;
                  if (steadyAlignFramesRef.current >= 12) {
                    // Face is strictly centered! 1-second pause with positive feedback before firing Blink
                    currentStage = "cooldown";
                    setLivenessStage("cooldown");
                    nextStageAfterCooldownRef.current = "blink";
                    cooldownUntilRef.current = nowInMs + 1000;
                    setCooldownMessage("Face centered! Get ready...");
                  }
                } else {
                  steadyAlignFramesRef.current = Math.max(
                    0,
                    steadyAlignFramesRef.current - 1,
                  );
                }
              } else if (currentStage === "blink") {
                // Command: Blink both eyes
                if (blinkLeft > 0.38 || blinkRight > 0.38) {
                  eyesClosedRef.current = true;
                }
                // Eyes re-opened after being closed
                if (
                  eyesClosedRef.current &&
                  blinkLeft < 0.30 &&
                  blinkRight < 0.30
                ) {
                  eyesClosedRef.current = false;
                  // Blink verified! 1-second pause before firing Turn command
                  currentStage = "cooldown";
                  setLivenessStage("cooldown");
                  nextStageAfterCooldownRef.current = "turn";
                  cooldownUntilRef.current = nowInMs + 1000;
                  setCooldownMessage("Blink verified! ✓");
                }
              } else if (currentStage === "turn") {
                // Command: Turn head slightly right OR smile
                const isTurned = Math.abs(noseRel - 0.5) > 0.10;
                const isSmiling = smileScore > 0.34;

                if (isTurned || isSmiling) {
                  turnActionFramesRef.current += 1;
                  if (turnActionFramesRef.current >= 4) {
                    // Action verified! 1-second pause before firing Hold command
                    currentStage = "cooldown";
                    setLivenessStage("cooldown");
                    nextStageAfterCooldownRef.current = "hold";
                    cooldownUntilRef.current = nowInMs + 1000;
                    setCooldownMessage("Action verified! ✓");
                  }
                } else {
                  turnActionFramesRef.current = Math.max(
                    0,
                    turnActionFramesRef.current - 1,
                  );
                }
              } else if (currentStage === "hold") {
                // Command: Hold still at center for at least 1 full continuous second
                const isStrictlyCentered = distFromCenter <= 1.0;
                const isHeadLevel = eyeTilt <= 0.05;
                const isLookingForward = Math.abs(noseRel - 0.5) <= 0.12;
                const eyesOpen = blinkLeft < 0.36 && blinkRight < 0.36;

                // All criteria must be satisfied simultaneously throughout the entire 1s:
                const satisfiesHold =
                  isStrictlyCentered &&
                  isHoldingStill &&
                  isHeadLevel &&
                  isLookingForward &&
                  eyesOpen;

                if (satisfiesHold) {
                  if (!holdStartTimeRef.current) {
                    holdStartTimeRef.current = nowInMs;
                  }
                  const elapsed = nowInMs - holdStartTimeRef.current;
                  const targetDuration = 1000; // at least 1.0 full continuous second
                  const pct = Math.min(
                    100,
                    Math.round((elapsed / targetDuration) * 100),
                  );
                  setHoldProgress(pct);

                  if (elapsed >= targetDuration) {
                    // FINAL AT-CAPTURE VERIFICATION:
                    // Ensure the face is still strictly on the center and eyes open on the exact snapshot frame!
                    if (distFromCenter <= 1.0 && eyesOpen && isHeadLevel) {
                      currentStage = "verified";
                      setLivenessStage("verified");
                      setShowFlash(true);
                      // Snap immediately on this exact verified frame!
                      handleSnapSelfie();
                      setTimeout(() => {
                        setShowFlash(false);
                      }, 250);
                      return;
                    }
                  }
                } else {
                  // User drifted off-center, moved rapidly, tilted, or closed eyes:
                  holdStartTimeRef.current = null;
                  setHoldProgress(0);

                  // Provide immediate real-time corrective guidance
                  if (!isStrictlyCentered) {
                    setAlignmentFeedback(
                      dx < -0.06
                        ? "Move face right to center"
                        : dx > 0.06
                          ? "Move face left to center"
                          : dy < -0.07
                            ? "Move face down to center"
                            : "Place face in the center",
                    );
                  } else if (!isHoldingStill) {
                    setAlignmentFeedback("Hold completely still...");
                  } else if (!eyesOpen) {
                    setAlignmentFeedback("Keep eyes open and look at camera");
                  }
                }
              }
            } else {
              // No face detected in frame
              setAlignmentFeedback("Position face in the center");
              setIsFaceCentered(false);
              steadyAlignFramesRef.current = 0;
              if (currentStage === "hold") {
                holdStartTimeRef.current = null;
                setHoldProgress(0);
              }
            }
          } catch {
            // Ignore minor detection frame hiccups
          }
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
      };

      animationFrameRef.current = requestAnimationFrame(processFrame);
    }

    initAndRunLiveness();

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isSelfie, preview, uploadedMediaId, cameraState]);

  /** Normalizes uploaded images to standard JPEG and resizes large phone photos if needed */
  async function normalizeImageFile(file: File): Promise<File> {
    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      return file;
    }

    const isStandard =
      (file.type === "image/jpeg" || file.type === "image/png") &&
      file.size <= 2.5 * 1024 * 1024;
    if (isStandard) {
      return file;
    }

    try {
      return await new Promise<File>((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const maxDim = 1920;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const cleanName =
                file.name.replace(/\.[^/.]+$/, "") + ".jpeg";
              const normalized = new File([blob], cleanName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(normalized);
            },
            "image/jpeg",
            0.88,
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(file);
        };
        img.src = url;
      });
    } catch {
      return file;
    }
  }

  // Snap a real-time live selfie from video stream, cropped to the exact visible portrait oval
  const handleSnapSelfie = () => {
    const video = videoRef.current;
    if (!video) return;

    const vidWidth = video.videoWidth || 1280;
    const vidHeight = video.videoHeight || 720;
    const vidAspect = vidWidth / vidHeight;
    const targetAspect = 4 / 5; // Portrait aspect ratio of the oval

    let cropW = vidWidth;
    let cropH = vidHeight;
    let startX = 0;
    let startY = 0;

    if (vidAspect > targetAspect) {
      // Horizontal webcam: crop sides to match 4:5 portrait oval
      cropW = Math.round(vidHeight * targetAspect);
      startX = Math.round((vidWidth - cropW) / 2);
    } else {
      cropH = Math.round(vidWidth / targetAspect);
      startY = Math.round((vidHeight - cropH) / 2);
    }

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally to give natural mirror experience matching what the user saw
    ctx.translate(cropW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie_${Date.now()}.jpeg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        stopCamera();
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
      },
      "image/jpeg",
      0.92,
    );
  };

  // Retake selfie: restarts the live camera and liveness detection
  const handleRetakeSelfie = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    setUploadedMediaId(null);
    setUploadError(null);
    setLivenessStage("align");
    setIsFaceCentered(false);
    setHoldProgress(0);
    setCooldownMessage(null);
    steadyAlignFramesRef.current = 0;
    eyesClosedRef.current = false;
    turnActionFramesRef.current = 0;
    holdStartTimeRef.current = null;
    prevFaceAnchorRef.current = null;
    cooldownUntilRef.current = 0;
    nextStageAfterCooldownRef.current = null;
    startCamera();
  };

  // Upload file explicitly triggered by user clicking the upload button
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);

    const cleanId = idNumber.replace(/\s+/g, "").trim();

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", isSelfie ? "selfie" : "document_front");
      if (documentType) formData.append("idType", documentType);
      if (cleanId) formData.append("idNumber", cleanId);

      const res = await fetch("/api/kyc/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        mediaId?: string;
        error?: string;
      };

      if (res.ok && data.mediaId) {
        setUploadedMediaId(data.mediaId);
      } else {
        console.error("[KYC Capture] Upload error response:", data);
        setUploadError(
          data.error || "Failed to upload file. Please try again.",
        );
      }
    } catch (err) {
      console.error("[KYC Capture] Upload network/runtime error:", err);
      setUploadError("Network connection error while uploading. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  // Document photo picked (preview only)
  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;

    setUploadedMediaId(null);
    setUploadError(null);

    const processedFile = await normalizeImageFile(file);

    setSelectedFile(processedFile);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(processedFile);
    });
  };

  // Clean ID for submission
  const rawId = idNumber.replace(/\s+/g, "").trim();
  const isNin = documentType === "nin";
  const isIdValid = isNin ? rawId.length === 11 : rawId.length >= 5;

  // Complete step and proceed back to task checklist
  const handleContinue = () => {
    onDone({
      file: selectedFile || undefined,
      idNumber: rawId || undefined,
      mediaId: uploadedMediaId || undefined,
    });
  };

  // The frame answers to the capture state first, then to the liveness step.
  const stage = STAGE[livenessStage];
  const live = isSelfie && !preview && cameraState === "ready";
  const blocked = cameraState === "denied" || cameraState === "unsupported";
  const tone =
    TONE[
      preview
        ? "good"
        : isSelfie && blocked
          ? "danger"
          : !live
            ? "rest"
            : livenessStage === "align"
              ? isFaceCentered
                ? "good"
                : "idle"
              : stage.tone
    ];

  // A cooldown is the detector confirming the step just passed, so it speaks
  // for itself; otherwise the stage's own copy, or the detector's live line.
  const StatusIcon = cooldownMessage ? CheckIcon : stage.Icon;
  const statusLabel = cooldownMessage ?? stage.label ?? alignmentFeedback;

  return (
    <>
      <h1 className="mt-6 text-[26px] leading-8 font-bold text-jumpa-black">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-5 text-jumpa-neutral-500">
        {description}
      </p>

      {/* Hidden File Input for Documents */}
      {!isSelfie && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf,image/*"
          onChange={(event) => handleFilePicked(event.target.files?.[0])}
          className="sr-only"
        />
      )}

      {/* Mandatory ID Number Input for Document Step */}
      {!isSelfie && (
        <div className="mt-5 flex flex-col gap-2 rounded-card border border-jumpa-neutral-100 bg-jumpa-white p-4 shadow-jumpa-sm">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="idNumberInput"
              className="text-xs leading-4 font-semibold text-jumpa-black"
            >
              {isNin
                ? "National Identification Number (NIN)"
                : "Document / ID Number"}
            </label>
            {isNin && (
              <span
                className={`flex shrink-0 items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] leading-4 font-semibold transition-colors ${
                  isIdValid
                    ? "bg-jumpa-success/10 text-jumpa-success"
                    : "bg-jumpa-neutral-95 text-jumpa-neutral-400"
                }`}
              >
                {isIdValid && (
                  <CheckIcon aria-hidden="true" className="size-3 shrink-0" />
                )}
                {rawId.length}/11
              </span>
            )}
          </div>
          <input
            id="idNumberInput"
            type="text"
            inputMode={isNin ? "numeric" : "text"}
            value={idNumber}
            onChange={(e) =>
              setIdNumber(formatIdInput(e.target.value, documentType))
            }
            placeholder={isNin ? "e.g. 123 456 78901" : "Enter document number"}
            className={`h-11.5 w-full rounded-panel border px-3 text-sm leading-5 font-semibold tracking-wide text-jumpa-black outline-none transition-colors placeholder:font-normal placeholder:text-jumpa-secondary-200 ${
              isIdValid
                ? "border-jumpa-success bg-jumpa-success/5"
                : "border-jumpa-neutral-100 bg-jumpa-neutral-50 focus:border-jumpa-primary-600 focus:bg-jumpa-white"
            }`}
          />
          <p className="text-[11px] leading-4 text-jumpa-neutral-400">
            {isNin
              ? "Enter your 11-digit NIN exactly as issued by NIMC."
              : "Enter your official document number."}
          </p>
        </div>
      )}

      {/* Capture Frame (Live Webcam for Selfie, Upload Card for Document) */}
      <div className={FRAME[shape].wrap}>
        <div
          className={`relative flex items-center justify-center overflow-hidden ${
            isSelfie ? `${tone.ring} ${tone.halo}` : ""
          } ${FRAME[shape].frame}`}
        >
          {isSelfie ? (
            preview ? (
              // biome-ignore lint/performance/noImgElement: dynamic blob URL preview
              <img
                src={preview}
                alt="Captured selfie preview"
                className="size-full object-cover"
              />
            ) : blocked ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-jumpa-danger-50 text-jumpa-danger">
                  <SealAlertIcon aria-hidden="true" className="size-6" />
                </span>
                <span className="text-sm leading-5 font-semibold text-jumpa-black">
                  Camera access needed
                </span>
                <span className="text-[11px] leading-4 text-jumpa-neutral-400">
                  We need your camera to check you are really here. Allow it in
                  your browser, then try again.
                </span>
              </div>
            ) : cameraState === "requesting" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
                <RefreshIcon
                  aria-hidden="true"
                  className="size-7 animate-spin text-jumpa-primary-600"
                />
                <span className="text-xs leading-4 font-medium text-jumpa-neutral-400">
                  Starting camera
                </span>
              </div>
            ) : (
              <div className="relative size-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="size-full -scale-x-100 object-cover"
                />

                {/* Softens the hard cut where the video meets the oval. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 rounded-[50%] shadow-jumpa-vignette"
                />

                {/* Only while the detector is still looking for a face, so a
                    camera that is working never reads as frozen. */}
                {livenessStage === "align" && !isFaceCentered ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 animate-kyc-scan bg-gradient-to-b from-transparent via-jumpa-alt-400/25 to-transparent"
                  />
                ) : null}

                {/* Face guide. The oval's own border carries the status colour,
                    so this stays white and quiet or the frame reads as two. */}
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <svg
                    viewBox="0 0 200 250"
                    className={`h-[76%] w-[68%] transition-opacity duration-300 ${
                      isFaceCentered
                        ? "text-jumpa-white opacity-80"
                        : "text-jumpa-white opacity-40"
                    }`}
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>Face alignment guide</title>
                    <ellipse
                      cx="100"
                      cy="115"
                      rx="56"
                      ry="76"
                      stroke="currentColor"
                      strokeWidth={isFaceCentered ? "2" : "1.25"}
                      strokeDasharray={isFaceCentered ? "none" : "6 7"}
                      strokeLinecap="round"
                    />
                    {[
                      "M100 28V38",
                      "M100 192V202",
                      "M34 115H44",
                      "M156 115H166",
                    ].map((d) => (
                      <path
                        key={d}
                        d={d}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                </div>

                {showFlash && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-30 animate-kyc-flash bg-jumpa-white"
                  />
                )}
              </div>
            )
          ) : (
            // Document Mode: Upload Box
            <button
              type="button"
              onClick={() => {
                if (!preview) fileInputRef.current?.click();
              }}
              aria-label={preview ? "Document photo preview" : "Choose a photo"}
              className={`flex size-full items-center justify-center ${
                preview ? "cursor-default" : "tap cursor-pointer"
              }`}
            >
              {preview ? (
                // biome-ignore lint/performance/noImgElement: dynamic blob URL preview
                <img
                  src={preview}
                  alt="Uploaded document preview"
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex flex-col items-center gap-2 px-6 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
                    <ImageIcon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="text-sm leading-5 font-semibold text-jumpa-black">
                    Upload or take a photo
                  </span>
                  <span className="text-[11px] leading-4 text-jumpa-neutral-400">
                    JPEG, PNG or PDF, up to 3MB
                  </span>
                </span>
              )}
            </button>
          )}

          {uploadedMediaId && !uploading && (
            <span className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-pill bg-jumpa-success px-2.5 py-1 text-[11px] leading-4 font-semibold text-jumpa-white shadow-jumpa-sm">
              <CheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
              Uploaded
            </span>
          )}
        </div>

        {/* Retake / Replace */}
        {preview && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={
                isSelfie
                  ? handleRetakeSelfie
                  : () => fileInputRef.current?.click()
              }
              className="tap flex items-center gap-1.5 rounded-pill bg-jumpa-neutral-50 px-3.5 py-2 text-xs leading-4 font-semibold text-jumpa-neutral-700 active:scale-95"
            >
              <RefreshIcon aria-hidden="true" className="size-3.5 shrink-0" />
              {isSelfie ? "Retake selfie" : "Replace photo"}
            </button>
          </div>
        )}
      </div>

      {/* Liveness rail and status. The rail is the only progress display —
          the hold step fills its own segment rather than adding a second bar. */}
      {live && (
        <>
          <div aria-hidden="true" className="mt-4 flex items-center gap-1.5">
            {LIVENESS_STEPS.map((label, index) => {
              const done = index < stage.step;
              const current = index === stage.step;
              const fill = done
                ? 100
                : !current
                  ? 0
                  : livenessStage === "hold"
                    ? holdProgress
                    : 100;
              return (
                <span
                  key={label}
                  className="h-1 flex-1 overflow-hidden rounded-pill bg-jumpa-neutral-100"
                >
                  <span
                    className={`block h-full rounded-pill transition-[width] duration-200 ${
                      done || livenessStage === "hold"
                        ? "bg-jumpa-success"
                        : "bg-jumpa-primary-600"
                    }`}
                    style={{ width: `${fill}%` }}
                  />
                </span>
              );
            })}
          </div>

          <p
            aria-live="polite"
            className={`mt-3 flex min-h-11 items-center justify-center gap-2 rounded-pill px-4 text-sm leading-5 font-semibold transition-colors ${tone.pill}`}
          >
            <StatusIcon aria-hidden="true" className="size-4.5 shrink-0" />
            {statusLabel}
          </p>
        </>
      )}

      {uploadedMediaId && (
        <p className="mt-3 flex items-center gap-2 rounded-panel bg-jumpa-success/10 px-3 py-2.5 text-[11.5px] leading-4 font-medium text-jumpa-success">
          <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
          {isSelfie
            ? "Selfie captured and verified"
            : "Document uploaded successfully"}
        </p>
      )}

      {uploadError && (
        <p className="mt-2 flex items-center gap-2 rounded-panel bg-jumpa-danger-50 px-3 py-2.5 text-xs leading-4 font-medium text-jumpa-danger">
          <SealAlertIcon aria-hidden="true" className="size-4 shrink-0" />
          {uploadError}
        </p>
      )}

      {/* Main Dynamic Action Button */}
      <div className="mt-auto pt-6">
        {uploading ? (
          <Button variant="gradient" size="lg" disabled>
            <span className="flex items-center gap-2">
              <RefreshIcon aria-hidden="true" className="size-5 animate-spin" />
              {isSelfie ? "Uploading selfie" : "Uploading document"}
            </span>
          </Button>
        ) : isSelfie ? (
          !preview ? (
            blocked ? (
              <Button variant="gradient" size="lg" onClick={startCamera}>
                <span className="flex items-center gap-2">
                  <CameraIcon aria-hidden="true" className="size-5" />
                  Allow camera
                </span>
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="lg"
                onClick={handleSnapSelfie}
                disabled={cameraState !== "ready"}
              >
                <span className="flex items-center gap-2">
                  <CameraIcon aria-hidden="true" className="size-5" />
                  {cameraState === "ready" ? stage.cta : "Take live selfie"}
                </span>
              </Button>
            )
          ) : !uploadedMediaId ? (
            <Button variant="gradient" size="lg" onClick={handleUpload}>
              <span className="flex items-center gap-2">
                <CloudIcon aria-hidden="true" className="size-5" />
                Upload selfie
              </span>
            </Button>
          ) : (
            <Button variant="gradient" size="lg" onClick={handleContinue}>
              Continue
            </Button>
          )
        ) : preview && !uploadedMediaId ? (
          <Button
            variant="gradient"
            size="lg"
            onClick={handleUpload}
            disabled={!isIdValid}
          >
            <span className="flex items-center gap-2">
              {isIdValid ? (
                <>
                  <CloudIcon aria-hidden="true" className="size-5" />
                  Upload document
                </>
              ) : isNin ? (
                "Enter your 11-digit NIN"
              ) : (
                "Enter your ID number"
              )}
            </span>
          </Button>
        ) : uploadedMediaId ? (
          <Button
            variant="gradient"
            size="lg"
            onClick={handleContinue}
            disabled={!isIdValid}
          >
            {isIdValid
              ? "Continue to live selfie"
              : isNin
                ? "Enter your 11-digit NIN"
                : "Enter your ID number"}
          </Button>
        ) : (
          <Button
            variant="gradient"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="flex items-center gap-2">
              <ImageIcon aria-hidden="true" className="size-5" />
              Choose or take photo
            </span>
          </Button>
        )}
      </div>
    </>
  );
}
