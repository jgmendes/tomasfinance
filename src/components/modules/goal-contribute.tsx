"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, PiggyBank } from "lucide-react";
import type { Goal } from "@/lib/database.types";

export function GoalContribute({
  goal,
  onDone,
}: {
  goal: Goal;
  onDone: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(value);
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setSaving(true);
    const newAmount = Number(goal.current_amount) + amount;
    const reached = newAmount >= Number(goal.target_amount);
    const { error } = await supabase
      .from("goals")
      .update({
        current_amount: newAmount,
        status: reached ? "concluida" : goal.status,
      })
      .eq("id", goal.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao aportar", { description: error.message });
      return;
    }
    toast.success(
      reached ? "🎉 Meta concluída!" : `Aporte de R$ ${amount.toFixed(2)} registrado!`
    );
    setOpen(false);
    setValue("");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-3 w-full">
          <PiggyBank className="h-4 w-4" /> Aportar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Aportar em &quot;{goal.title}&quot;</DialogTitle>
        </DialogHeader>
        <form onSubmit={contribute} className="space-y-4">
          <div className="grid gap-2">
            <Label>Valor do aporte</Label>
            <CurrencyInput value={value} onValueChange={setValue} autoFocus />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar aporte
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
