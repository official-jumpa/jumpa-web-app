/** Signed-in column. Same `max-w-app` cap as the auth flow. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-app bg-jumpa-white">
      {children}
    </div>
  );
}
