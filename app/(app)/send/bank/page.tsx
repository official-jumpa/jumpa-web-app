import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import { BankTransferView } from "@/components/send/bank-transfer-view";

export const metadata: Metadata = { title: "Bank transfer" };

export default async function BankTransferPage() {
  const session = await getCachedAuthSession();

  let defaultCountry = "Nigeria";
  if (session?.user?.id) {
    const user = await getUserById(session.user.id);
    if (user?.country) {
      defaultCountry = user.country;
    }
  }

  return <BankTransferView defaultCountry={defaultCountry} />;
}
