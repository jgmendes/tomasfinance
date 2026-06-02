"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Target,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  { label: "Receitas", href: "/receitas", icon: TrendingUp },
  { label: "Despesas", href: "/despesas", icon: TrendingDown },
  { label: "Metas", href: "/metas", icon: Target },
  { label: "CFO", href: "/cfo", icon: Bot },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "scale-110")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
