"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import type { MomentCard } from "@/lib/savings-moments";
import { renderMomentCard } from "@/lib/share-card";

export type MomentImage =
  | { status: "rendering"; url: string | null; blob: null }
  | { status: "ready"; url: string; blob: Blob }
  | { status: "error"; url: null; blob: null };

/**
 * The share card for a moment, as an object URL for the preview and a blob for
 * sharing. The previous image stays on screen while the next one draws, so the
 * amounts toggle swaps the card rather than blanking it.
 */
export function useMomentImage(
  card: MomentCard,
  showAmounts: boolean,
): MomentImage {
  const [image, setImage] = useState<MomentImage>({
    status: "rendering",
    url: null,
    blob: null,
  });
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImage((current) => ({
      status: "rendering",
      url: current.url,
      blob: null,
    }));

    renderMomentCard(card, { showAmounts })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setImage({ status: "ready", url, blob });
        track("savings_card_generated", { moment: card.label, showAmounts });
      })
      .catch(() => {
        if (!cancelled) setImage({ status: "error", url: null, blob: null });
      });

    return () => {
      cancelled = true;
    };
  }, [card, showAmounts]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return image;
}
