import { MarkdownText } from "@/components/chat/markdown-text";
import { cn } from "@/lib/cn";

/**
 * One line or block of conversation: renders markdown, prose in a squared-off bubble, and short replies as pills.
 */
export function MessageBubble({
  children,
  from,
  paragraph,
}: {
  children: string;
  from: "user" | "agent";
  paragraph?: boolean;
}) {
  const isMultiLineOrLong =
    paragraph ||
    children.includes("\n") ||
    children.includes("**") ||
    children.includes("[") ||
    children.includes("`") ||
    children.includes("|") ||
    children.length > 45;

  return (
    <div
      className={cn(
        "bg-jumpa-neutral-95 text-[15px] leading-5.5 text-jumpa-black break-words [overflow-wrap:anywhere] max-w-full overflow-hidden",
        isMultiLineOrLong
          ? "w-full max-w-[340px] sm:max-w-[420px] rounded-surface px-4.5 py-3.5 shadow-xs"
          : cn(
              "flex min-h-11 items-center rounded-pill py-2.5 max-w-full",
              from === "user" ? "px-6.5 text-right" : "px-4.5",
            ),
      )}
    >
      <MarkdownText content={children} />
    </div>
  );
}
