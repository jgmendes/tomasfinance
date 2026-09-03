"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarNav } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { Logo } from "./logo";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Handshake, LogOut, Menu, Settings, User } from "lucide-react";

interface TopbarProps {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAdmin?: boolean;
}

export function Topbar({ email, fullName, avatarUrl, isAdmin = false }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (fullName || email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/crm/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        {/* Menu mobile */}
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="left-0 top-0 h-full max-w-[280px] translate-x-0 translate-y-0 overflow-y-auto rounded-none p-0 sm:rounded-none">
            <div className="border-b px-4 py-4">
              <Logo className="text-[15px]" />
            </div>
            <div>
              <SidebarNav isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
        {/* Logo no mobile (substitui a saudação quando não há sidebar) */}
        <Link href="/crm/dashboard" className="lg:hidden">
          <Logo showText={false} />
        </Link>
        <h1 className="hidden text-sm font-medium text-muted-foreground sm:block">
          Olá, {fullName?.split(" ")[0] || "bem-vindo"} 👋
        </h1>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        <Button size="sm" asChild className="mr-1">
          <Link href="/intermediacao/negociacoes">
            <Handshake className="h-4 w-4" /> <span className="hidden sm:inline">Negociações</span>
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild title="Configurações">
          <Link href="/crm/configuracoes">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>
        <NotificationBell />
        <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full outline-none">
            <Avatar>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || ""} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{fullName || "Usuário"}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/crm/configuracoes">
              <User className="h-4 w-4" /> Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/crm/configuracoes">
              <Settings className="h-4 w-4" /> Configurações
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive">
            <LogOut className="h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
