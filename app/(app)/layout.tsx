import { AppColumn } from "@/components/ui/app-column";

/** Signed-in column. Same shell as the auth flow. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppColumn>{children}</AppColumn>;
}
