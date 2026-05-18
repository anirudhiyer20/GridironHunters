import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data?.user) {
    redirect("/app");
  }

  return children;
}
