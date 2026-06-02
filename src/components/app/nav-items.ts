import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Layers,
  Target,
  LineChart,
  Building2,
  Users,
  RefreshCw,
  FileText,
  Bot,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Visão Geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Dashboard Executivo", href: "/executivo", icon: LineChart },
      { label: "CFO Virtual (IA)", href: "/cfo", icon: Bot },
    ],
  },
  {
    title: "Movimentações",
    items: [
      { label: "Receitas", href: "/receitas", icon: TrendingUp },
      { label: "Despesas", href: "/despesas", icon: TrendingDown },
      { label: "Cartões", href: "/cartoes", icon: CreditCard },
      { label: "Parcelamentos", href: "/parcelamentos", icon: Layers },
      { label: "Assinaturas", href: "/assinaturas", icon: RefreshCw },
    ],
  },
  {
    title: "Patrimônio",
    items: [
      { label: "Metas", href: "/metas", icon: Target },
      { label: "Investimentos", href: "/investimentos", icon: LineChart },
    ],
  },
  {
    title: "Negócios",
    items: [
      { label: "Empresas", href: "/empresas", icon: Building2 },
      { label: "Funcionários", href: "/funcionarios", icon: Users },
      { label: "Relatórios", href: "/relatorios", icon: FileText },
    ],
  },
  {
    title: "Conta",
    items: [{ label: "Minha Conta", href: "/configuracoes", icon: Settings }],
  },
];

/** Grupo exibido apenas para administradores. */
export const adminGroup: { title: string; items: NavItem[] } = {
  title: "Administração",
  items: [{ label: "Abrir Painel Admin", href: "/admin", icon: Shield }],
};
