import type { NegotiationStatus } from "@/lib/database.types";

export const STATUS_LABEL: Record<NegotiationStatus, string> = {
  solicitacao_recebida: "Solicitação recebida",
  em_analise: "Em análise",
  negociacao: "Negociação",
  contraproposta_enviada: "Contraproposta enviada",
  contraproposta_recebida: "Contraproposta recebida",
  aprovada: "Condição aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

/** Cor de fundo/texto por status (classes Tailwind, mesmo estilo das dot bullets já usadas no app). */
export const STATUS_COLOR: Record<NegotiationStatus, string> = {
  solicitacao_recebida: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  em_analise: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  negociacao: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  contraproposta_enviada: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  contraproposta_recebida: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  aprovada: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  recusada: "bg-red-500/15 text-red-600 dark:text-red-400",
  cancelada: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export function negotiationNumber(n: number) {
  return `#${String(n).padStart(6, "0")}`;
}
