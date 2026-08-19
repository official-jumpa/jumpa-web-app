/** Signed-in column. Same 430px cap as the auth flow. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-jumpa-white">
      {children}
    </div>
  );
}
