"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { showLocalNotification } from "@/lib/push";
import type { Reminder } from "@/lib/database.types";

const CHECK_INTERVAL = 60_000;

/** Sem UI: dispara notificações locais quando um lembrete vence. */
export function ReminderWatcher() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function check() {
      const { data } = await supabase
        .from("reminders")
        .select("*")
        .eq("status", "pendente")
        .eq("notified", false)
        .lte("remind_at", new Date().toISOString());
      const due = (data ?? []) as Reminder[];
      if (cancelled || due.length === 0) return;

      for (const r of due) {
        await showLocalNotification("Lembrete", r.title, "/lembretes");
        await supabase.from("notifications").insert({
          user_id: r.user_id,
          title: "Lembrete",
          message: r.title,
          type: "info",
          link: "/lembretes",
        });
        await supabase.from("reminders").update({ notified: true }).eq("id", r.id);

        // Lembrete recorrente: agenda a próxima ocorrência (ex.: mesmo horário amanhã).
        if (r.recurrence === "daily") {
          const next = new Date(r.remind_at);
          next.setDate(next.getDate() + 1);
          await supabase.from("reminders").insert({
            user_id: r.user_id,
            title: r.title,
            remind_at: next.toISOString(),
            status: "pendente",
            notified: false,
            recurrence: "daily",
          });
        }
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
