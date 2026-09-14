import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NgnAccountDetails } from "@/components/ngn/ngn-account-details";
import { NgnAccountView } from "@/components/ngn/ngn-account-view";

interface NgnAccountPageProps {
  searchParams: Promise<{ view?: string }>;
}

export async function generateMetadata({
  searchParams,
}: NgnAccountPageProps): Promise<Metadata> {
  const { view } = await searchParams;
  return { title: view === "details" ? "NGN Account" : "Open NGN Account" };
}

/** Opening the account and the account itself — one route, not two. */
export default async function NgnAccountPage({
  searchParams,
}: NgnAccountPageProps) {
  const { view } = await searchParams;

  if (view === "details") return <NgnAccountDetails />;
  if (view) notFound();

  return <NgnAccountView />;
}
