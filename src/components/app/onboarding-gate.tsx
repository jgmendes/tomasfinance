"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { onboardingCompanySchema, firstError } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  AlarmClock,
  Building2,
  Check,
  Layers,
  Loader2,
  User,
} from "lucide-react";
import type { UsageType } from "@/lib/database.types";

interface Props {
  completed: boolean;
  usageType: UsageType | null;
  hasCompany: boolean;
  fullName: string | null;
}

type Step = "usage" | "company" | "reminder";

const USAGE_OPTIONS: { value: UsageType; label: string; desc: string; icon: typeof User }[] = [
  { value: "pessoal", label: "Só pessoal", desc: "Minhas receitas, despesas e investimentos.", icon: User },
  { value: "empresarial", label: "Empresa(s)", desc: "Sou dono de empresa e quero controlar o caixa dela.", icon: Building2 },
  { value: "ambos", label: "Pessoal + empresa", desc: "Quero organizar minha vida financeira e a da minha empresa juntas.", icon: Layers },
];

function needsCompanyStep(usageType: UsageType | null) {
  return usageType === "empresarial" || usageType === "ambos";
}

function initialStep(usageType: UsageType | null, hasCompany: boolean): Step {
  if (!usageType) return "usage";
  if (needsCompanyStep(usageType) && !hasCompany) return "company";
  return "reminder";
}

export function OnboardingGate({ completed, usageType, hasCompany, fullName }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [localCompleted, setLocalCompleted] = useState(false);
  const [step, setStep] = useState<Step>(() => initialStep(usageType, hasCompany));
  const [savingUsage, setSavingUsage] = useState<UsageType | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [companyCnpj, setCompanyCnpj] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [finishing, setFinishing] = useState(false);

  if (completed || localCompleted) return null;

  async function chooseUsage(value: UsageType) {
    setSavingUsage(value);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSavingUsage(null);
      return;
    }
    const { error } = await supabase.from("profiles").update({ usage_type: value }).eq("id", user.id);
    setSavingUsage(null);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    setStep(needsCompanyStep(value) ? "company" : "reminder");
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    const validationError = firstError(onboardingCompanySchema, { name: companyName, cnpj: companyCnpj });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSavingCompany(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSavingCompany(false);
      return;
    }
    const { error } = await supabase.from("companies").insert({
      user_id: user.id,
      name: companyName.trim(),
      cnpj: companyCnpj.trim() || null,
    });
    setSavingCompany(false);
    if (error) {
      toast.error("Erro ao cadastrar empresa", { description: error.message });
      return;
    }
    toast.success("Empresa cadastrada!");
    setStep("reminder");
  }

  async function finish() {
    setFinishing(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setFinishing(false);
      return;
    }

    if (reminderEnabled) {
      const [h, m] = reminderTime.split(":").map(Number);
      const remindAt = new Date();
      remindAt.setHours(h, m, 0, 0);
      if (remindAt.getTime() <= Date.now()) {
        remindAt.setDate(remindAt.getDate() + 1);
      }
      const { error: reminderError } = await supabase.from("reminders").insert({
        user_id: user.id,
        title: "Registrar gastos do dia",
        remind_at: remindAt.toISOString(),
        status: "pendente",
        notified: false,
        recurrence: "daily",
      });
      if (reminderError) {
        toast.error("Não deu pra criar o lembrete diário", { description: reminderError.message });
      }
    }

    const { error } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    setFinishing(false);
    if (error) {
      toast.error("Erro ao concluir", { description: error.message });
      return;
    }
    setLocalCompleted(true);
    router.refresh();
  }

  const stepNumber = step === "usage" ? 1 : step === "company" ? 2 : needsCompanyStep(usageType) ? 3 : 2;
  const totalSteps = needsCompanyStep(usageType) ? 3 : 2;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-background/80 p-6 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Passo {stepNumber} de {totalSteps}
          </p>

          {step === "usage" && (
            <div>
              <h2 className="text-xl font-bold">
                {fullName ? `Bem-vindo, ${fullName.split(" ")[0]}!` : "Bem-vindo!"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Como você vai usar o Tomas Finance?
              </p>
              <div className="mt-5 grid gap-3">
                {USAGE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={savingUsage !== null}
                    onClick={() => chooseUsage(o.value)}
                    className="flex items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10">
                      {savingUsage === o.value ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <o.icon className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{o.label}</p>
                      <p className="text-xs text-muted-foreground">{o.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "company" && (
            <form onSubmit={saveCompany}>
              <h2 className="text-xl font-bold">Cadastre sua empresa</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Dá pra cadastrar outras empresas depois, a qualquer momento, em "Empresas".
              </p>
              <div className="mt-5 space-y-4">
                <div className="grid gap-2">
                  <Label>Nome da empresa</Label>
                  <Input
                    autoFocus
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Minha Empresa LTDA"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <Button type="submit" className="mt-6 w-full" disabled={savingCompany}>
                {savingCompany && <Loader2 className="h-4 w-4 animate-spin" />}
                Cadastrar e continuar
              </Button>
            </form>
          )}

          {step === "reminder" && (
            <div>
              <h2 className="text-xl font-bold">Não esqueça de registrar seus gastos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quem lança os gastos todo dia mantém o controle certo. Podemos te lembrar automaticamente,
                todo dia, no horário que você escolher.
              </p>
              <button
                type="button"
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className="mt-5 flex w-full items-center gap-3 rounded-xl border p-4 text-left"
              >
                <div
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded border",
                    reminderEnabled ? "border-primary bg-primary text-primary-foreground" : "border-input"
                  )}
                >
                  {reminderEnabled && <Check className="h-3.5 w-3.5" />}
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <AlarmClock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Lembrar todo dia de registrar meus gastos</span>
                </div>
              </button>
              {reminderEnabled && (
                <div className="mt-3 grid gap-2">
                  <Label>Horário do lembrete</Label>
                  <Input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
              <Button className="mt-6 w-full" size="lg" onClick={finish} disabled={finishing}>
                {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
                Concluir e ir para o Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
