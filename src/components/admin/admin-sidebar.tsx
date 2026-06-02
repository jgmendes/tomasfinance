"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Visão Geral", href: "/admin", icon: LayoutDashboard },
  { label: "Usuários", href: "/admin/usuarios", icon: Users },
  { label: "KYC", href: "/admin/kyc", icon: ShieldCheck },
  { label: "Assinaturas", href: "/admin/assinaturas", icon: Sparkles },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const Nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto space-y-1 pt-4">
        <Link href="/dashboard" onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/10 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao app
        </Link>
        <button onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-white/10">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Topbar mobile admin */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-slate-950 px-4 text-white lg:hidden">
        <span className="flex items-center gap-2 font-bold">
          <LogoMark className="h-7 w-7" /> Admin
        </span>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {open && (
        <div className="fixed inset-0 top-14 z-40 flex flex-col bg-slate-950 text-white lg:hidden">
          {Nav}
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5 font-bold">
          <LogoMark className="h-8 w-8" />
          <div className="leading-tight">
            <p className="text-sm">Tomaz Finanças</p>
            <p className="text-[10px] uppercase tracking-wider text-primary">Painel Admin</p>
          </div>
        </div>
        {Nav}
        <div className="border-t border-white/10 p-3 text-xs text-slate-400">{email}</div>
      </aside>
    </>
  );
}
