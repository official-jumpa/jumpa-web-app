import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import { BankTransferView } from "@/components/send/bank-transfer-view";

export const metadata: Metadata = { title: "Bank transfer" };

interface PageProps {
  searchParams?: Promise<{
    network?: string;
    asset?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

export default async function BankTransferPage(props: PageProps) {
  const session = await getCachedAuthSession();
  const searchParams = props.searchParams ? await props.searchParams : {};

  let defaultCountry = "Nigeria";
  if (session?.user?.id) {
    const user = await getUserById(session.user.id);
    if (user?.country) {
      defaultCountry = user.country;
    }
  }

  const initialNetwork =
    typeof searchParams.network === "string" ? searchParams.network : undefined;
  const initialAsset =
    typeof searchParams.asset === "string" ? searchParams.asset : undefined;

  return (
    <BankTransferView
      defaultCountry={defaultCountry}
      initialNetwork={initialNetwork}
      initialAsset={initialAsset}
    />
  );
}
