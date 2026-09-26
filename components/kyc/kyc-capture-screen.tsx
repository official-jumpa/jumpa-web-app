"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiEye,
  FiRefreshCw,
  FiUploadCloud,
  FiUser,
  FiSmile,
  FiCamera,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { CameraIcon } from "@/components/ui/icons/camera";

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
const FRAME = {
  box: "w-full h-48 shrink-0 rounded-surface bg-jumpa-neutral-50 border border-jumpa-neutral-200",
  oval: "mx-auto aspect-[4/5] h-[min(46dvh,340px)] rounded-[50%] border-2 bg-jumpa-neutral-50 overflow-hidden relative transition-all duration-300",
} as const;

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
  const [livenessStage, setLivenessStage] = useState<
    "align" | "cooldown" | "blink" | "turn" | "hold" | "verified"
  >("align");

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
  const nextStageAfterCooldownRef = useRef<
    "align" | "blink" | "turn" | "hold" | "verified" | null
  >(null);

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
    let currentStage: "align" | "cooldown" | "blink" | "turn" | "hold" | "verified" = "align";

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

  // Dynamic oval frame border based on liveness stage
  const ovalBorderClass =
    isSelfie && !preview
      ? livenessStage === "verified" || holdProgress === 100
        ? "border-emerald-500 shadow-[0_0_24px_#10b981]"
        : livenessStage === "hold"
          ? "border-emerald-400 shadow-[0_0_16px_#34d399]"
          : livenessStage === "turn" || livenessStage === "blink"
            ? "border-amber-400 shadow-[0_0_16px_#f59e0b]"
            : isFaceCentered
              ? "border-emerald-400 shadow-[0_0_14px_#10b981]"
              : "border-dashed border-jumpa-neutral-200"
      : "border-dashed border-jumpa-neutral-200";

  return (
    <>
      <style>{`
        @keyframes kycFlash {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }
        .animate-kyc-flash {
          animation: kycFlash 0.35s ease-out forwards;
        }
      `}</style>

      <h1 className="mt-6 text-[26px] leading-8 font-bold text-jumpa-black">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-5 text-jumpa-black">{description}</p>

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
        <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="idNumberInput"
              className="text-xs font-bold text-slate-800">
              {isNin
                ? "National Identification Number (NIN)"
                : "Document / ID Number"}
            </label>
            {isNin && (
              <span
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  rawId.length === 11
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-500"
                }`}>
                {rawId.length === 11 && (
                  <FiCheckCircle className="size-3 text-emerald-600" />
                )}
                {rawId.length}/11 digits
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
            placeholder={
              isNin ? "e.g. 123 456 78901" : "Enter document number"
            }
            className={`w-full rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-wide focus:outline-none transition-all ${
              isIdValid
                ? "bg-emerald-50/30 border border-emerald-400 text-slate-900"
                : "bg-slate-50 border border-slate-200 text-slate-900 focus:border-jumpa-primary-500 focus:bg-white"
            }`}
          />
          <p className="text-[11px] text-slate-500">
            {isNin
              ? "Enter your 11-digit NIN exactly as issued by NIMC."
              : "Enter your official document number."}
          </p>
        </div>
      )}

      {/* Capture Frame (Live Webcam for Selfie, Upload Card for Document) */}
      <div className="relative mt-4">
        <div
          className={`flex items-center justify-center overflow-hidden relative ${
            isSelfie ? `mb-2 ${ovalBorderClass}` : ""
          } ${FRAME[shape]}`}>
          {isSelfie ? (
            // Selfie Mode: Clean camera stream with no overlays covering the face
            preview ? (
              // biome-ignore lint/performance/noImgElement: dynamic blob URL preview
              <img
                src={preview}
                alt="Captured selfie preview"
                className="size-full object-cover"
              />
            ) : cameraState === "denied" || cameraState === "unsupported" ? (
              <div className="flex flex-col items-center justify-center p-5 text-center h-full gap-2 text-slate-700">
                <CameraIcon className="size-10 text-rose-500" />
                <span className="text-xs font-bold text-rose-700">
                  Camera Access Required
                </span>
                <span className="text-[11.5px] text-slate-500 leading-relaxed">
                  Camera access is required to perform live biometric verification.
                  Please enable camera permissions in your browser.
                </span>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-transform">
                  Enable Camera
                </button>
              </div>
            ) : cameraState === "requesting" ? (
              <div className="flex flex-col items-center justify-center p-4 text-center h-full gap-2 text-slate-400">
                <FiRefreshCw className="size-8 text-jumpa-primary-600 animate-spin" />
                <span className="text-xs font-medium">Starting camera...</span>
              </div>
            ) : (
              <div className="size-full relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="size-full object-cover -scale-x-100"
                />

                {/* Precise Center Target Reticle Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <svg
                    viewBox="0 0 200 250"
                    className={`w-[68%] h-[76%] transition-all duration-300 ${
                      isFaceCentered
                        ? "text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                        : "text-white/45"
                    }`}
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    {/* Elliptical Head Target Zone */}
                    <ellipse
                      cx="100"
                      cy="115"
                      rx="56"
                      ry="76"
                      stroke="currentColor"
                      strokeWidth={isFaceCentered ? "2.5" : "1.5"}
                      strokeDasharray={isFaceCentered ? "none" : "5 5"}
                    />
                    {/* Center Crosshair ticks */}
                    <line
                      x1="100"
                      y1="28"
                      x2="100"
                      y2="38"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="100"
                      y1="192"
                      x2="100"
                      y2="202"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="34"
                      y1="115"
                      x2="44"
                      y2="115"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="156"
                      y1="115"
                      x2="166"
                      y2="115"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* White Flash Effect on Snap */}
                {showFlash && (
                  <div className="absolute inset-0 bg-white z-30 animate-kyc-flash pointer-events-none" />
                )}
              </div>
            )
          ) : (
            // Document Mode: Upload Box
            <button
              type="button"
              onClick={() => {
                if (!preview) {
                  fileInputRef.current?.click();
                }
              }}
              aria-label={preview ? "Document photo preview" : "Choose a photo"}
              className={`size-full flex items-center justify-center ${
                preview ? "cursor-default" : "cursor-pointer tap"
              }`}>
              {preview ? (
                // biome-ignore lint/performance/noImgElement: dynamic blob URL preview
                <img
                  src={preview}
                  alt="Uploaded document preview"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-jumpa-neutral-400 p-4 text-center">
                  <FiUploadCloud className="size-9 text-jumpa-neutral-350" />
                  <span className="text-xs font-semibold text-jumpa-black">
                    Tap to upload document photo or take picture
                  </span>
                  <span className="text-[11px] text-jumpa-neutral-400">
                    Supports JPEG, PNG, or PDF up to 3MB
                  </span>
                </div>
              )}
            </button>
          )}

          {/* Upload Status Overlay Pill */}
          {uploadedMediaId && !uploading && (
            <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white rounded-full px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 shadow-md z-10">
              <FiCheckCircle className="size-3.5" />
              <span>Uploaded</span>
            </div>
          )}
        </div>

        {/* Retake / Replace Actions */}
        {preview && (
          <div className="mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={
                isSelfie
                  ? handleRetakeSelfie
                  : () => fileInputRef.current?.click()
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer">
              <FiRefreshCw className="size-3 text-slate-600" />
              <span>{isSelfie ? "Retake Selfie" : "Replace Photo"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Real-Time Command Instructions (Rendered Outside Camera Area) */}
      {isSelfie && !preview && cameraState === "ready" && (
        <div className="mt-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center transition-all min-h-[58px]">
          {cooldownMessage ? (
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 animate-pulse">
              <FiCheckCircle className="size-4 text-emerald-600 shrink-0" />
              <span>{cooldownMessage}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              {livenessStage === "align" && (
                <>
                  <FiUser
                    className={`size-4 shrink-0 ${
                      isFaceCentered ? "text-emerald-600" : "text-sky-500"
                    }`}
                  />
                  <span>{alignmentFeedback}</span>
                </>
              )}

              {livenessStage === "blink" && (
                <>
                  <FiEye className="size-4 text-amber-500 animate-pulse shrink-0" />
                  <span>Blink your eyes</span>
                </>
              )}

              {livenessStage === "turn" && (
                <>
                  <FiSmile className="size-4 text-amber-500 animate-bounce shrink-0" />
                  <span>Turn head slightly right</span>
                </>
              )}

              {livenessStage === "hold" && (
                <>
                  <FiCamera className="size-4 text-emerald-600 animate-pulse shrink-0" />
                  <span>
                    {isFaceCentered
                      ? "Hold still and look at the camera"
                      : alignmentFeedback}
                  </span>
                </>
              )}

              {livenessStage === "verified" && (
                <>
                  <FiCheckCircle className="size-4 text-emerald-600 shrink-0" />
                  <span>Taking photo...</span>
                </>
              )}
            </div>
          )}

          {/* Smooth 1-second progress bar during Hold Still */}
          {livenessStage === "hold" && !cooldownMessage && (
            <div className="mt-2.5 w-full max-w-[220px]">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-100"
                  style={{ width: `${holdProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Notification Badge */}
      {uploadedMediaId && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <FiCheckCircle className="size-4 text-emerald-600 shrink-0" />
            <span>
              {isSelfie
                ? "Selfie captured and verified successfully"
                : "Document photo uploaded successfully"}
            </span>
          </div>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {uploadError}
        </div>
      )}

      {/* Main Dynamic Action Button */}
      <div className="mt-auto pt-5">
        {uploading ? (
          <Button
            variant="gradient"
            size="lg"
            className="cursor-pointer font-bold"
            disabled={true}>
            <span className="flex items-center gap-2">
              <FiRefreshCw className="size-5 animate-spin" />
              <span>
                {isSelfie ? "Uploading Selfie..." : "Uploading Document..."}
              </span>
            </span>
          </Button>
        ) : isSelfie ? (
          // Selfie Mode Actions
          !preview ? (
            cameraState === "denied" || cameraState === "unsupported" ? (
              <Button
                variant="gradient"
                size="lg"
                className="cursor-pointer font-bold"
                onClick={startCamera}>
                <span>Allow Camera to Continue</span>
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="lg"
                className="cursor-pointer font-bold"
                onClick={handleSnapSelfie}>
                <span className="flex items-center gap-2">
                  <CameraIcon className="size-5" />
                  <span>
                    {livenessStage === "align"
                      ? "Center Face in Oval"
                      : livenessStage === "blink"
                        ? "Blink Eyes to Progress"
                        : livenessStage === "turn"
                          ? "Turn Head to Progress"
                          : livenessStage === "hold"
                            ? "Holding Still..."
                            : "Take Live Selfie"}
                  </span>
                </span>
              </Button>
            )
          ) : !uploadedMediaId ? (
            <Button
              variant="gradient"
              size="lg"
              className="cursor-pointer font-bold"
              onClick={handleUpload}>
              <span className="flex items-center gap-2">
                <FiUploadCloud className="size-5" />
                <span>Upload Selfie</span>
              </span>
            </Button>
          ) : (
            <Button
              variant="gradient"
              size="lg"
              className="cursor-pointer font-bold"
              onClick={handleContinue}>
              <span className="flex items-center gap-2">
                <span>Continue</span>
                <FiCheckCircle className="size-5" />
              </span>
            </Button>
          )
        ) : (
          // Document Mode Actions
          preview && !uploadedMediaId ? (
            !isIdValid ? (
              <Button
                variant="gradient"
                size="lg"
                className="cursor-not-allowed opacity-60 font-bold"
                disabled={true}>
                <span>
                  {isNin
                    ? "Enter 11-Digit NIN to Upload"
                    : "Enter Valid ID Number to Upload"}
                </span>
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="lg"
                className="cursor-pointer font-bold"
                onClick={handleUpload}>
                <span className="flex items-center gap-2">
                  <FiUploadCloud className="size-5" />
                  <span>Upload Document</span>
                </span>
              </Button>
            )
          ) : uploadedMediaId ? (
            !isIdValid ? (
              <Button
                variant="gradient"
                size="lg"
                className="cursor-not-allowed opacity-60 font-bold"
                disabled={true}>
                <span>
                  {isNin
                    ? "Enter 11-Digit NIN to Continue"
                    : "Enter Valid ID Number to Continue"}
                </span>
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="lg"
                className="cursor-pointer font-bold"
                onClick={handleContinue}>
                <span className="flex items-center gap-2">
                  <span>Continue to Live Selfie</span>
                  <FiCheckCircle className="size-5" />
                </span>
              </Button>
            )
          ) : (
            <Button
              variant="gradient"
              size="lg"
              className="cursor-pointer font-bold"
              onClick={() => fileInputRef.current?.click()}>
              <span className="flex items-center gap-2">
                <FiUploadCloud className="size-5" />
                <span>Choose or Take Photo</span>
              </span>
            </Button>
          )
        )}
      </div>
    </>
  );
}
