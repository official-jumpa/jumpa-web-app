import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UsdAccountDetails } from "@/components/usd/usd-account-details";
import { UsdAccountView } from "@/components/usd/usd-account-view";

interface UsdAccountPageProps {
  searchParams: Promise<{ view?: string }>;
}

export async function generateMetadata({
  searchParams,
}: UsdAccountPageProps): Promise<Metadata> {
  const { view } = await searchParams;
  return { title: view === "details" ? "USD Account" : "Open USD Account" };
}

/** Opening the account and the account itself — one route, not two. */
export default async function UsdAccountPage({
  searchParams,
}: UsdAccountPageProps) {
  const { view } = await searchParams;

  if (view === "details") return <UsdAccountDetails />;
  if (view) notFound();

  return <UsdAccountView />;
}
