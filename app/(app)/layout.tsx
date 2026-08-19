import { BottomNav } from "@/components/home/bottom-nav";

/** Signed-in column. Same 430px cap as the auth flow, plus the shared tab bar. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-jumpa-white">
      {children}
      <BottomNav />
    </div>
  );
}
