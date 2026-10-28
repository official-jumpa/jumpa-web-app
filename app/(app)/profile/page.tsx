import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditProfile } from "@/components/profile/edit-profile";
import { KycTiers } from "@/components/profile/kyc-tiers";
import { getCanonicalCountryName } from "@/lib/countries";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import {
  findWalletById,
  findWalletForUser,
} from "@/lib/functions/walletFunctions";
import { getKycRecordByUserId } from "@/lib/functions/kycFunctions";
import { ProfileView } from "@/components/profile/profile-view";
import { isProfileView, PROFILE_VIEWS } from "@/lib/profile";

interface ProfilePageProps {
  searchParams: Promise<{ view?: string }>;
}

export async function generateMetadata({
  searchParams,
}: ProfilePageProps): Promise<Metadata> {
  const { view } = await searchParams;
  if (view && isProfileView(view)) return { title: PROFILE_VIEWS[view].title };
  return { title: "Profile" };
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { view } = await searchParams;
  if (view && !isProfileView(view)) notFound();

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

      initialUser = user
        ? { ...JSON.parse(JSON.stringify(user)), id: user._id }
        : session.user;
      initialKycVerified = Boolean(
        kyc?.isCompleted ||
          kyc?.status === "approved" ||
          kyc?.stage === "completed",
      );

      // Only the profile itself shows the wallet.
      const wallet = view
        ? null
        : user?.activeWalletId
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

  if (view === "edit") {
    return (
      <EditProfile
        name={initialUser?.name ?? null}
        nickname={initialUser?.nickname ?? null}
        country={
          getCanonicalCountryName(initialUser?.country) ??
          initialUser?.country ??
          null
        }
        image={initialUser?.image ?? null}
      />
    );
  }
  if (view === "tiers") return <KycTiers kycVerified={initialKycVerified} />;

  return (
    <ProfileView
      initialUser={initialUser}
      initialWalletAddresses={initialWalletAddresses}
      initialKycVerified={initialKycVerified}
    />
  );
}
