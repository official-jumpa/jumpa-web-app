import { AppColumn } from "@/components/ui/app-column";

/** Light column for the sign-up flow. Same shell as the signed-in app. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AppColumn>{children}</AppColumn>;
}
