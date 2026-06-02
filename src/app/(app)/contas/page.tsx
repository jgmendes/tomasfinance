"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Wallet, Landmark } from "lucide-react";
import type { BankAccount, Transaction } from "@/lib/database.types";

const ACCOUNT_TYPES = [
  { value: "banco", label: "Banco" },
  { value: "carteira", label: "Carteira" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
];

interface Extra {
  balances: Record<string, number>;
  total: number;
}

export default function ContasPage() {
  return (
    <CrudModule<BankAccount>
      title="Contas Bancárias"
      description="Saldo real de cada conta (inicial + movimentações liquidadas)"
      table="bank_accounts"
      icon={Wallet}
      newLabel="Nova conta"
      orderBy="name"
      ascending
      fields={[
        { name: "name", label: "Nome da conta", required: true, span2: true, placeholder: "Ex: Nubank, Carteira..." },
        { name: "type", label: "Tipo", type: "select", options: ACCOUNT_TYPES, placeholder: "Tipo" },
        { name: "bank_name", label: "Banco", placeholder: "Ex: Nubank" },
        { name: "initial_balance", label: "Saldo inicial", type: "currency" },
        { name: "color", label: "Cor", placeholder: "#0ea5e9" },
      ]}
      defaultValues={{ id: "", name: "", type: "banco", bank_name: "", initial_balance: "", color: "#0ea5e9" }}
      loadExtra={async (supabase, accounts): Promise<Extra> => {
        const { data } = await supabase.from("transactions").select("*");
        const txs = (data ?? []) as Transaction[];
        const balances: Record<string, number> = {};
        let total = 0;
        for (const a of accounts) {
          let bal = Number(a.initial_balance);
          for (const t of txs) {
            if (t.account_id !== a.id) continue;
            if (t.status !== "pago" && t.status !== "recebido") continue;
            bal += t.type === "receita" ? Number(t.amount) : -Number(t.amount);
          }
          balances[a.id] = bal;
          total += bal;
        }
        return { balances, total };
      }}
      renderStats={(items, extra?: Extra) => (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <StatCard title="Saldo consolidado (real)" value={formatCurrency(extra?.total ?? 0)} icon={Landmark} />
          <StatCard title="Total de contas" value={String(items.length)} icon={Wallet} accent="text-sky-500" iconBg="bg-sky-500/10" />
        </div>
      )}
      renderCard={(a, actions, extra?: Extra) => {
        const balance = extra?.balances?.[a.id] ?? Number(a.initial_balance);
        return (
          <>
            <CardActions {...actions} />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl" style={{ background: a.color ?? "#0ea5e9" }} />
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.bank_name || a.type}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Saldo atual</p>
              <p className={`text-2xl font-bold ${balance < 0 ? "text-red-500" : ""}`}>
                {formatCurrency(balance)}
              </p>
              <p className="text-xs text-muted-foreground">
                Inicial: {formatCurrency(Number(a.initial_balance))}
              </p>
            </div>
            <Badge variant="outline" className="mt-3 capitalize">{a.type}</Badge>
          </>
        );
      }}
    />
  );
}
