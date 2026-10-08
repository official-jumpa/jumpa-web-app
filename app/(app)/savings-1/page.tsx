import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SavingsOption1View } from "@/components/savings/savings-option-1-view";

export const metadata: Metadata = { title: "Savings - Option 1" };

export default function SavingsOption1Page() {
  if (process.env.NODE_ENV === "production") {
    notFound();
    // TODO: depreciate this page when the new design is ready
  }

  return <SavingsOption1View />;
}

