import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import {
  findWalletById,
  findWalletForUser,
} from "@/lib/functions/walletFunctions";
import { getKycRecordByUserId } from "@/lib/functions/kycFunctions";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  let initialUser: any = null;
  let initialWalletAddresses: {
    xlm?: string;
    base?: string;
    eth?: string;
    sol?: string;
    [key: string]: string | undefined;
  } | null = null;
  let initialKycVerified = false;

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const [user, kyc] = await Promise.all([
        getUserById(session.user.id),
        getKycRecordByUserId(session.user.id),
      ]);

      initialUser = user || session.user;
      initialKycVerified = Boolean(
        kyc?.isCompleted ||
          kyc?.status === "approved" ||
          kyc?.stage === "completed",
      );

      const wallet = user?.activeWalletId
        ? await findWalletById(user.activeWalletId)
        : await findWalletForUser(session.user.id);

      if (wallet) {
        if (wallet.addresses && Object.keys(wallet.addresses).length > 0) {
          initialWalletAddresses = wallet.addresses as any;
        } else if (wallet.address) {
          initialWalletAddresses = { xlm: wallet.address };
        }
      }
    }
  } catch (err) {
    console.warn("[ProfilePage SSR] Prefetch fallback:", err);
  }

  return (
    <ProfileView
      initialUser={initialUser}
      initialWalletAddresses={initialWalletAddresses}
      initialKycVerified={initialKycVerified}
    />
  );
}
