import { cn } from "@/lib/cn";

const SIZE = {
  md: "size-9.5 text-sm",
  sm: "size-7 text-xs",
};

/** A person from the team: their initial on lime, where the assistant gets the Jumpa mark. */
export function AgentMark({
  name,
  size = "md",
}: {
  name: string;
  size?: keyof typeof SIZE;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-jumpa-alt-400 font-semibold text-jumpa-primary-900 uppercase",
        SIZE[size],
      )}
    >
      {name.trim().charAt(0) || "J"}
    </span>
  );
}
