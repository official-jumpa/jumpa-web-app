import { MarkdownText } from "@/components/chat/markdown-text";
import { cn } from "@/lib/cn";

/**
 * One line or block of conversation: renders markdown, prose in a squared-off bubble, and short replies as pills.
 */
function sanitizeBubbleContent(content: string): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"intent"')) {
    const msgMatch = trimmed.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (msgMatch) {
      try {
        return JSON.parse(`"${msgMatch[1]}"`);
      } catch {
        return msgMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
      }
    }
  }
  return content;
}

export function MessageBubble({
  children,
  from,
  paragraph,
  reveal,
}: {
  children: string;
  from: "user" | "agent";
  paragraph?: boolean;
  reveal?: boolean;
}) {
  const cleanContent = sanitizeBubbleContent(children);
  const isMultiLineOrLong =
    paragraph ||
    cleanContent.includes("\n") ||
    cleanContent.includes("**") ||
    cleanContent.includes("[") ||
    cleanContent.includes("`") ||
    cleanContent.includes("|") ||
    cleanContent.length > 45;

  return (
    <div
      className={cn(
        "bg-jumpa-neutral-95 text-[15px] leading-5.5 text-jumpa-black break-words [overflow-wrap:anywhere] max-w-full overflow-hidden",
        // Both variants share `rounded-xl`: a 44px-tall pill reads as a 22px
        // corner, so leaving short replies capsule-shaped would mismatch.
        isMultiLineOrLong
          ? // The group in transcript.tsx sets the column width per role.
            "w-full rounded-xl px-4.5 py-3.5 shadow-xs"
          : cn(
              "flex min-h-11 items-center rounded-xl py-2.5 max-w-full",
              from === "user" ? "px-6.5 text-right" : "px-4.5",
            ),
      )}
    >
      <MarkdownText content={children} reveal={reveal} />
    </div>
  );
}
