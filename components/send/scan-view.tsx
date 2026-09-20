"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InfoNote } from "@/components/auth/info-note";
import { Button } from "@/components/ui/button";
import { ScanIcon } from "@/components/ui/icons/scan";
import { ScreenHeader } from "@/components/ui/screen-header";

/** How often a frame is read. Faster than this buys nothing and costs battery. */
const SCAN_MS = 180;

type Phase = "starting" | "scanning" | "denied" | "unsupported";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (options?: {
  formats: string[];
}) => BarcodeDetectorLike;

type Decode = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
) => Promise<string | null>;

/**
 * Chromium decodes QR natively; iOS Safari ships no `BarcodeDetector`, so jsQR
 * is loaded on demand there rather than in everyone's bundle.
 */
async function createDecoder(): Promise<Decode> {
  const Detector = (
    window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  ).BarcodeDetector;

  if (Detector) {
    try {
      const detector = new Detector({ formats: ["qr_code"] });
      return async (video) => {
        try {
          const codes = await detector.detect(video);
          return codes[0]?.rawValue ?? null;
        } catch {
          return null;
        }
      };
    } catch {
      // Present but without QR support — fall through to jsQR.
    }
  }

  const { default: jsQR } = await import("jsqr");
  return async (video, canvas) => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(video, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    return (
      jsQR(frame.data, width, height, { inversionAttempts: "dontInvert" })
        ?.data ?? null
    );
  };
}

/** Wallets encode a `stellar:`/`ethereum:` URI as often as a bare address. */
export function readAddress(raw: string): string {
  const text = raw.trim();
  const uri = text.match(/^(?!https?:)[a-z][a-z0-9+.-]*:([^?#@\s]+)/i);
  return (uri ? uri[1] : text).trim();
}

const FRAME =
  "relative mt-6 aspect-square w-full overflow-hidden rounded-key bg-jumpa-black";
const CORNER = "absolute size-10 border-jumpa-alt-400";

/**
 * The camera side of the address field. There is no frame for this screen — it
 * is the client's ask — so it borrows the app's own header and note shapes.
 */
export function ScanView({ back = "/send/wallet" }: { back?: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("starting");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");

    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
      if (stream) for (const track of stream.getTracks()) track.stop();
    };

    async function start() {
      const media = navigator.mediaDevices;
      // Needs a secure origin, which the installed app always has.
      if (!media?.getUserMedia) {
        setPhase("unsupported");
        return;
      }

      try {
        stream = await media.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        setPhase("denied");
        return;
      }

      const video = videoRef.current;
      if (stopped || !video) {
        stop();
        return;
      }

      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Autoplay was refused; the poster frame still decodes once it resolves.
      }

      const decode = await createDecoder();
      setPhase("scanning");

      const tick = async () => {
        if (stopped) return;
        const raw = await decode(video, canvas);
        if (stopped) return;

        const address = raw ? readAddress(raw) : "";
        if (address) {
          stop();
          // `replace`, so Back from the address field leaves the flow rather
          // than reopening the camera on the code it just read.
          router.replace(`/send/wallet?address=${encodeURIComponent(address)}`);
          return;
        }
        timer = window.setTimeout(tick, SCAN_MS);
      };

      tick();
    }

    start();
    return stop;
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back={back} title="Scan QR code" round />

      <div className={FRAME}>
        <video
          ref={videoRef}
          muted
          playsInline
          // No audio track is requested, so there is nothing to caption.
          aria-label="Camera preview"
          className="size-full object-cover"
        >
          <track kind="captions" />
        </video>

        {phase === "scanning" ? null : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-jumpa-black px-8 text-center text-jumpa-white">
            <ScanIcon aria-hidden="true" className="size-8 opacity-70" />
            <span className="text-xs leading-4 font-medium opacity-80">
              {phase === "starting"
                ? "Starting the camera…"
                : phase === "denied"
                  ? "Camera access is off"
                  : "This browser cannot open the camera"}
            </span>
          </span>
        )}

        {/* Corner brackets, so the viewfinder reads as one even over a busy frame. */}
        <span
          className={`${CORNER} top-5 left-5 rounded-tl-xl border-t-3 border-l-3`}
        />
        <span
          className={`${CORNER} top-5 right-5 rounded-tr-xl border-t-3 border-r-3`}
        />
        <span
          className={`${CORNER} bottom-5 left-5 rounded-bl-xl border-b-3 border-l-3`}
        />
        <span
          className={`${CORNER} right-5 bottom-5 rounded-br-xl border-r-3 border-b-3`}
        />
      </div>

      <p className="mt-5 text-center text-sm leading-5 font-medium text-jumpa-neutral-500">
        Point the camera at a wallet QR code. The address fills itself in.
      </p>

      {phase === "denied" ? (
        <InfoNote tone="warning" className="mt-4">
          Allow camera access for this site in your browser settings, then open
          this screen again.
        </InfoNote>
      ) : null}

      <Button href={back} className="mt-auto font-semibold" size="lg">
        Enter the address instead
      </Button>
    </div>
  );
}
