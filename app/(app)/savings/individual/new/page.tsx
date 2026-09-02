import { CreateTargetView } from "@/components/savings/create-target-view";
import { PROMOTIONS } from "@/lib/wallet";

export default function CreateTargetPage() {
  return <CreateTargetView promotions={PROMOTIONS} />;
}
