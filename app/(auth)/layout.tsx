import { AppColumn } from "@/components/ui/app-column";

/** Light column for the auth flows. Same shell as the signed-in app. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppColumn>{children}</AppColumn>;
}
