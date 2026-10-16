import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons/check";
import { StarIcon } from "@/components/ui/icons/star";
import { cn } from "@/lib/cn";
import type { TicketStatus } from "@/lib/support-tickets";
import { StatusCard } from "./status-card";

const SCORES = [1, 2, 3, 4, 5] as const;
/** At or under this, ask what went wrong — that is the answer the team can act on. */
const ASK_WHY_AT = 3;
const COMMENT_MAX = 500;

type Stage = "pick" | "why" | "done";

/** Resolved: a one-tap rating, and a line of feedback when it went badly. */
export function RatingCard({
  status,
  rating,
  busy,
  onRate,
}: {
  status: TicketStatus;
  rating: number | null;
  busy: boolean;
  onRate: (score: number, comment?: string) => Promise<boolean>;
}) {
  const [stage, setStage] = useState<Stage>(rating ? "done" : "pick");
  const [score, setScore] = useState<number | null>(rating);
  const [comment, setComment] = useState("");
  const why = useRef<HTMLDivElement>(null);

  // The box opens under the sticky composer; bring it up into view.
  useEffect(() => {
    if (stage === "why")
      why.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [stage]);

  const pick = async (value: number) => {
    setScore(value);
    if (await onRate(value)) setStage(value <= ASK_WHY_AT ? "why" : "done");
  };

  const explain = async () => {
    if (!score || !comment.trim()) return setStage("done");
    if (await onRate(score, comment.trim())) setStage("done");
  };

  return (
    <StatusCard Icon={CheckIcon} title="Resolved">
      {stage === "done" ? (
        <p>Thanks for the feedback — it goes straight to the team.</p>
      ) : (
        <p>How did we do?</p>
      )}

      <fieldset className="flex gap-1">
        <legend className="sr-only">Rate this conversation</legend>
        {SCORES.map((value) => {
          const lit = score !== null && value <= score;
          return (
            <button
              key={value}
              type="button"
              disabled={busy || stage !== "pick"}
              aria-label={`Rate ${value} out of 5`}
              aria-pressed={score === value}
              onClick={() => pick(value)}
              className="tap flex size-9 items-center justify-center rounded-full active:scale-90 disabled:cursor-default"
            >
              <StarIcon
                filled={lit}
                className={cn(
                  "size-6",
                  lit ? "text-jumpa-warning" : "text-jumpa-neutral-300",
                )}
              />
            </button>
          );
        })}
      </fieldset>

      {stage === "why" ? (
        <div
          ref={why}
          className="flex scroll-mb-36 animate-rise flex-col gap-2"
        >
          <label htmlFor="support-rating-why" className="text-jumpa-black">
            Sorry it wasn't better. What could we have done differently?
          </label>
          <textarea
            id="support-rating-why"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={COMMENT_MAX}
            rows={3}
            className="resize-none rounded-tile bg-jumpa-white p-3 text-sm leading-5 text-jumpa-black ring-1 ring-jumpa-primary-100 ring-inset placeholder:text-jumpa-neutral-425 focus:ring-jumpa-primary-600 focus:outline-none"
            placeholder="Optional"
          />
          <Button
            type="button"
            variant="brand"
            size="sm"
            onClick={explain}
            disabled={busy}
          >
            {comment.trim() ? "Send feedback" : "Skip"}
          </Button>
        </div>
      ) : null}

      {status === "resolved" ? (
        <p className="text-jumpa-neutral-500">
          Still need help? Reply below and this conversation reopens.
        </p>
      ) : null}
    </StatusCard>
  );
}
