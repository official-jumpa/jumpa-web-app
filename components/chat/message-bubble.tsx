import { cn } from "@/lib/cn";

/**
 * One line of conversation: prose in a squared-off bubble, short replies as pills.
 * Both roles share a surface, so position is what tells them apart.
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
  return (
    <p
      className={cn(
        "bg-jumpa-neutral-95 text-[13px] leading-4 text-jumpa-black",
        paragraph
          ? "w-65 rounded-surface px-4 py-3.25"
          : cn(
              "flex h-9.75 items-center rounded-pill whitespace-nowrap",
              from === "user" ? "px-6.5" : "px-2.5",
            ),
      )}
    >
      {children}
    </p>
  );
}
