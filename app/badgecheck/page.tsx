import { AssetBadge } from "@/components/chat/chat-card";

export default function BadgeCheck() {
  return (
    <div className="flex flex-col items-start gap-3 bg-jumpa-white p-4">
      {["solana", "stellar", "base", "ethereum", "celo"].map((chain) => (
        <div key={chain} id={chain} className="flex h-16 items-center">
          <AssetBadge symbol="USDC" chain={chain} />
        </div>
      ))}
    </div>
  );
}
