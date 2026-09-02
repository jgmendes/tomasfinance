import { Handshake, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Só "Negociações" por enquanto — Solicitações, Parceiros, Propostas, Chat,
// Financeiro, Documentos e Auditoria entram nas próximas etapas da spec.
export const navItems: NavItem[] = [
  { label: "Negociações", href: "/intermediacao/negociacoes", icon: Handshake },
];
