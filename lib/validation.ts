/**
 * Form validation shared by the transfer, bill and KYC screens. A CTA is never
 * left dead: pressing it runs these rules and the messages land on the fields.
 */

/** Field-keyed messages. An empty object means the form is good to submit. */
export type FormErrors<Field extends string> = Partial<Record<Field, string>>;

/** Digits only — account and phone numbers get typed with spaces and dashes. */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Message for a number that has to reach a length, or undefined when it does.
 * `noun` names the field: "Account numbers", "Phone numbers".
 */
export function checkLength(
  value: string,
  length: number,
  noun: string,
  empty: string,
): string | undefined {
  const entered = digitsOf(value);
  if (entered.length === 0) return empty;
  if (entered.length < length) {
    return `${noun} are ${length} digits — you have entered ${entered.length}.`;
  }
  return undefined;
}

/** Brings the first flagged control into view, once React has rendered it. */
export function revealFirstError(scope: HTMLElement | null): void {
  requestAnimationFrame(() => {
    const target = scope?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.focus({ preventScroll: true });
  });
}
