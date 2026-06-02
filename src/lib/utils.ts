import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value || 0);
}

export function formatDate(date: string | Date) {
  if (!date) return "—";
  let d: Date;
  if (typeof date === "string") {
    // Data simples (yyyy-mm-dd) → meia-noite local; timestamp completo → parse direto
    d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + "T00:00:00") : new Date(date);
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function formatPercent(value: number) {
  return `${(value || 0).toFixed(1)}%`;
}

/** Início e fim do mês atual em formato ISO (yyyy-mm-dd). */
export function currentMonthRange(ref = new Date()) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export function monthLabel(monthIndex: number) {
  return [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ][monthIndex];
}
