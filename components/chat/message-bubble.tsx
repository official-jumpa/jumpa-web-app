import { cn } from "@/lib/cn";
import { MarkdownText } from "@/components/chat/markdown-text";

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
    children.length > 45;

  return (
    <div
      className={cn(
        "bg-jumpa-neutral-95 text-[13px] text-jumpa-black",
        isMultiLineOrLong
          ? "w-full max-w-72 rounded-surface px-4 py-3 shadow-xs"
          : cn(
              "flex min-h-9.75 items-center rounded-pill py-2",
              from === "user" ? "px-6.5 text-right" : "px-4",
            ),
      )}
    >
      <MarkdownText content={children} />
    </div>
  );
}
