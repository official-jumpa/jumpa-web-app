import { redirect } from "next/navigation";

/** Receive picks a wallet first; the design has no screen of its own for it. */
export default function ReceivePage() {
  redirect("/assets");
}
