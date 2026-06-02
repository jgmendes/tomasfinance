"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { PIE_COLORS } from "@/lib/chart-colors";

function tooltipFormatter(value: number) {
  return formatCurrency(Number(value));
}

export function CashFlowChart({
  data,
}: {
  data: { month: string; receitas: number; despesas: number; saldo: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="rec" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="desp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Area type="monotone" dataKey="receitas" stroke="#22c55e" fill="url(#rec)" strokeWidth={2} name="Receitas" />
        <Area type="monotone" dataKey="despesas" stroke="#ef4444" fill="url(#desp)" strokeWidth={2} name="Despesas" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BalanceBarChart({
  data,
}: {
  data: { month: string; saldo: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Bar dataKey="saldo" radius={[6, 6, 0, 0]} name="Saldo">
          {data.map((d, i) => (
            <Cell key={i} fill={d.saldo >= 0 ? "#7c3aed" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (!data.length)
    return (
      <div className="grid h-[280px] place-items-center text-sm text-muted-foreground">
        Sem despesas para exibir
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PatrimonyChart({
  data,
}: {
  data: { month: string; valor: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="pat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Area type="monotone" dataKey="valor" stroke="#7c3aed" fill="url(#pat)" strokeWidth={2} name="Patrimônio" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
