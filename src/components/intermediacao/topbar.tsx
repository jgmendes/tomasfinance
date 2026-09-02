"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ArrowLeftRight } from "lucide-react";

export function IntermediacaoTopbar({
  fullName,
  email,
  isAdmin,
}: {
  fullName: string | null;
  email: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/crm/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          Olá, {fullName?.split(" ")[0] || email} 👋
        </span>
        {isAdmin && (
          <Badge variant="secondary" className="text-[10px]">
            Admin
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" asChild title="Ir para o Tomas Finance">
          <Link href="/crm/dashboard">
            <ArrowLeftRight className="h-4 w-4" /> Tomas Finance
          </Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={logout} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
