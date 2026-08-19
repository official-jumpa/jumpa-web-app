/** Light column for the sign-up flow. Same 430px cap as the onboarding carousel. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-jumpa-white">
      {children}
    </div>
  );
}
