"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { showLocalNotification } from "@/lib/push";
import type { Notification } from "@/lib/database.types";

const SEEN_KEY = "tf_notif_seen";

const TYPE_DOT: Record<string, string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

export function NotificationBell() {
  const supabase = createClient();
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    // Gera/atualiza alertas com base nos dados financeiros
    await fetch("/api/notifications/generate", { method: "POST" }).catch(() => {});
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = (data ?? []) as Notification[];
    setItems(rows);

    // Dispara notificação local para alertas novos ainda não exibidos
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
      const seenSet = new Set(seen);
      const fresh = rows.filter((n) => !n.read && !seenSet.has(n.id));
      // limita a 3 para não floodar
      for (const n of fresh.slice(0, 3)) {
        showLocalNotification(n.title, n.message ?? undefined, n.link ?? undefined);
      }
      localStorage.setItem(SEEN_KEY, JSON.stringify(rows.map((n) => n.id)));
    } catch {
      // localStorage indisponível — ignora
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Check className="h-3 w-3" /> Marcar lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação.
            </p>
          ) : (
            items.map((n) => {
              const content = (
                <div
                  className={cn(
                    "flex gap-2 border-b px-3 py-2.5 text-sm last:border-0",
                    !n.read && "bg-accent/40"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      TYPE_DOT[n.type] ?? "bg-muted-foreground"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                    )}
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
