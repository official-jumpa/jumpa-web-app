"use client";

import { useState } from "react";

/** 38x24 switch. Lime knob on purple, per the design; there is no off state drawn. */
export function Toggle({
  label,
  defaultOn = true,
}: {
  label: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((prev) => !prev)}
      className={`relative h-6 w-9.5 shrink-0 rounded-pill tap ${
        on ? "bg-jumpa-primary-600" : "bg-jumpa-neutral-250"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-pill transition-[left,background-color] duration-200 ease-jumpa ${
          on ? "left-3.5 bg-jumpa-alt-400" : "left-0.5 bg-jumpa-white"
        }`}
      />
    </button>
  );
}
