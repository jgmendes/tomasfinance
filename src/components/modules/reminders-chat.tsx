"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { reminderSchema, firstError } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { AlarmClock, Bot, Check, Loader2, Send, User, X } from "lucide-react";
import type { Reminder } from "@/lib/database.types";

function defaultDateTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000); // daqui a 1h
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function RemindersChat() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState(defaultDateTime());

  const titleRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .order("created_at", { ascending: true });
    setReminders((data ?? []) as Reminder[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      titleRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [reminders]);

  const pendentes = useMemo(
    () => reminders.filter((r) => r.status === "pendente").sort((a, b) => a.remind_at.localeCompare(b.remind_at)),
    [reminders]
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const validationError = firstError(reminderSchema, { title, remind_at: remindAt });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("reminders").insert({
      user_id: user.id,
      title: title.trim(),
      remind_at: new Date(remindAt).toISOString(),
      status: "pendente",
      notified: false,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar lembrete", { description: error.message });
      return;
    }
    setTitle("");
    setRemindAt(defaultDateTime());
    load();
  }

  async function setStatus(id: string, status: "concluido" | "cancelado") {
    const { error } = await supabase.from("reminders").update({ status }).eq("id", id);
    if (error) return toast.error("Erro ao atualizar lembrete");
    load();
  }

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="border-b py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlarmClock className="h-5 w-5 text-primary" /> Lembretes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2 text-sm">
                Escreva algo que você quer lembrar e escolha a data/hora. Eu aviso você quando chegar a hora — inclusive pelo atalho do app no celular.
              </div>
            </div>
          ) : (
            reminders.map((r) => (
              <div key={r.id} className="flex gap-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">
                  <User className="h-4 w-4" />
                </div>
                <div className="max-w-[80%] space-y-1.5 rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm">
                  <p>{r.title}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        r.status === "concluido" ? "success" : r.status === "cancelado" ? "outline" : "warning"
                      }
                      className="text-[10px]"
                    >
                      {formatDateTime(r.remind_at)}
                    </Badge>
                    {r.status === "pendente" && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setStatus(r.id, "concluido")}
                          className="rounded-full bg-primary-foreground/15 p-1 hover:bg-primary-foreground/25"
                          title="Marcar como concluído"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(r.id, "cancelado")}
                          className="rounded-full bg-primary-foreground/15 p-1 hover:bg-primary-foreground/25"
                          title="Cancelar"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {r.status !== "pendente" && (
                      <span className="text-[10px] capitalize opacity-80">{r.status}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {pendentes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {pendentes.length} lembrete(s) pendente(s) — o próximo é{" "}
            <span className="font-medium">{formatDateTime(pendentes[0].remind_at)}</span>.
          </p>
        )}

        <form onSubmit={send} className={cn("flex flex-col gap-2 sm:flex-row")}>
          <Input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que você quer lembrar?"
            disabled={saving}
            className="flex-1"
          />
          <Input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            disabled={saving}
            className="sm:w-[200px]"
          />
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
