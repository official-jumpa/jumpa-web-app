/** Light column for the sign-up flow. Same `max-w-app` cap as the onboarding carousel. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-app bg-jumpa-white">
      {children}
    </div>
  );
}
