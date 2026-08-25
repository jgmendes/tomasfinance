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
  UserCheck,
  RefreshCw,
  FileText,
  Bot,
  Settings,
  Shield,
  AlarmClock,
  Receipt,
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
      { label: "Dashboard", href: "/crm/dashboard", icon: LayoutDashboard },
      { label: "Dashboard Executivo", href: "/crm/executivo", icon: LineChart },
      { label: "CFO Virtual (IA)", href: "/crm/cfo", icon: Bot },
      { label: "Lembretes", href: "/crm/lembretes", icon: AlarmClock },
    ],
  },
  {
    title: "Movimentações",
    items: [
      { label: "Receitas", href: "/crm/receitas", icon: TrendingUp },
      { label: "Despesas", href: "/crm/despesas", icon: TrendingDown },
      { label: "Cartões", href: "/crm/cartoes", icon: CreditCard },
      { label: "Parcelamentos", href: "/crm/parcelamentos", icon: Layers },
      { label: "Assinaturas", href: "/crm/assinaturas", icon: RefreshCw },
    ],
  },
  {
    title: "Patrimônio",
    items: [
      { label: "Metas", href: "/crm/metas", icon: Target },
      { label: "Investimentos", href: "/crm/investimentos", icon: LineChart },
    ],
  },
  {
    title: "Negócios",
    items: [
      { label: "Empresas", href: "/crm/empresas", icon: Building2 },
      { label: "Beneficiários", href: "/crm/beneficiarios", icon: UserCheck },
      { label: "Funcionários", href: "/crm/funcionarios", icon: Users },
      { label: "Impostos", href: "/crm/impostos", icon: Receipt },
      { label: "Relatórios", href: "/crm/relatorios", icon: FileText },
    ],
  },
  {
    title: "Conta",
    items: [{ label: "Minha Conta", href: "/crm/configuracoes", icon: Settings }],
  },
];

/** Grupo exibido apenas para administradores. */
export const adminGroup: { title: string; items: NavItem[] } = {
  title: "Administração",
  items: [{ label: "Abrir Painel Admin", href: "/crm/admin", icon: Shield }],
};
