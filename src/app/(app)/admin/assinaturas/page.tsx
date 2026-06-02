import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminBillingClient } from "@/components/modules/admin-billing-client";

export const dynamic = "force-dynamic";

export default async function AdminAssinaturasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((data as { role: string | null } | null)?.role !== "admin") redirect("/dashboard");

  return <AdminBillingClient />;
}
