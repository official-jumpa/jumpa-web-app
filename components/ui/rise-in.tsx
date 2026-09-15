"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

let hasAnimatedOnce = false;

/**
 * Fades a block up into place on first entrance.
 * Subsequent visits within the session render immediately without 0-opacity flickering.
 */
export function RiseIn({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const [animate] = useState(!hasAnimatedOnce);

  useEffect(() => {
    hasAnimatedOnce = true;
  }, []);

  return (
    <div
      className={cn(animate && "animate-rise stagger", className)}
      style={animate ? ({ "--i": index } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
