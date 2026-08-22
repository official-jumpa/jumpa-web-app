/**
 * Copies text and reports whether it landed.
 *
 * `navigator.clipboard` only exists in a secure context, which rules it out when
 * the app is opened over plain http from a phone on the LAN — so fall back to a
 * scratch textarea rather than throwing.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Not a secure context; fall through.
  }

  const scratch = document.createElement("textarea");
  scratch.value = value;
  scratch.setAttribute("readonly", "");
  scratch.style.position = "fixed";
  scratch.style.opacity = "0";
  document.body.append(scratch);
  scratch.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    // Nothing else to try.
  }
  scratch.remove();
  return copied;
}
