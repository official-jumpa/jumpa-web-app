import { CreateCircleView } from "@/components/savings/create-circle-view";
import { PROMOTIONS } from "@/lib/wallet";

export default function CreateCirclePage() {
  return <CreateCircleView promotions={PROMOTIONS} />;
}
