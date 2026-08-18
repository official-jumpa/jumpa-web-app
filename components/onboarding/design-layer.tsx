import type { ReactNode } from "react";

/** 393x852 coordinate space from Figma. Artwork offsets are relative to this box. */
export function DesignLayer({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute top-0 left-1/2 h-full w-[393px] -translate-x-1/2">
        {children}
      </div>
    </div>
  );
}
