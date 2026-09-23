import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserById, getUserBeneficiaries } from "@/lib/functions/userFunctions";
import { BankTransferView } from "@/components/send/bank-transfer-view";
import type { BankAccountItem } from "@/components/send/bank-transfer-form";

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
  let initialBeneficiaries: BankAccountItem[] | undefined = undefined;

  if (session?.user?.id) {
    try {
      const [user, beneficiaries] = await Promise.all([
        getUserById(session.user.id),
        getUserBeneficiaries(session.user.id, "bank"),
      ]);

      if (user?.country) {
        defaultCountry = user.country;
      }

      if (Array.isArray(beneficiaries)) {
        initialBeneficiaries = beneficiaries.map((b: any) => ({
          id: String(b._id || b.id),
          name: b.name,
          bank: b.details?.bankName || "",
          number: b.details?.accountNumber || "",
          country: b.details?.country || "Nigeria",
        }));
      }
    } catch (e) {
      console.error("[BankTransferPage] Prefetch error:", e);
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
      initialBeneficiaries={initialBeneficiaries}
    />
  );
}
