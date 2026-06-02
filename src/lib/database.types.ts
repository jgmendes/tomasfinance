// Tipos do banco de dados Supabase.
// Para regenerar automaticamente:
//   npx supabase gen types typescript --project-id SEU_ID > src/lib/database.types.ts
//
// Obs.: usamos `type` (e não `interface`) porque o supabase-js exige que cada
// linha satisfaça Record<string, unknown> — interfaces não possuem index
// signature implícita e fariam os tipos resolverem para `never`.

export type AccountType = "banco" | "carteira" | "dinheiro" | "pix" | "cartao";
export type TransactionType = "receita" | "despesa";
export type TransactionStatus =
  | "pendente"
  | "pago"
  | "recebido"
  | "atrasado"
  | "cancelado";
export type InvestmentType =
  | "cdb"
  | "tesouro"
  | "acoes"
  | "fii"
  | "cripto"
  | "fundo"
  | "outros";
export type GoalStatus = "em_andamento" | "concluida" | "pausada";
export type SubscriptionCycle = "mensal" | "anual" | "trimestral" | "semanal";
export type UserRole = "user" | "admin";
export type KycStatus = "nao_enviado" | "pendente" | "aprovado" | "rejeitado";
export type TransactionScope = "pessoal" | "empresarial";

type Timestamps = { created_at: string; updated_at: string | null };

export type Profile = Timestamps & {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  currency: string | null;
  role: UserRole;
  email: string | null;
  mfa_enabled: boolean;
};

export type Kyc = Timestamps & {
  id: string;
  user_id: string;
  full_name: string | null;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  occupation: string | null;
  monthly_income: number | null;
  document_type: string | null;
  document_number: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  status: KycStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type Company = Timestamps & {
  id: string;
  user_id: string;
  name: string;
  cnpj: string | null;
  description: string | null;
  color: string | null;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  created_at: string;
};

export type BankAccount = Timestamps & {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  type: AccountType;
  bank_name: string | null;
  initial_balance: number;
  color: string | null;
};

export type CreditCard = Timestamps & {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  brand: string | null;
  credit_limit: number;
  used_limit: number;
  best_purchase_day: number | null;
  closing_day: number | null;
  due_day: number | null;
  color: string | null;
};

export type Transaction = Timestamps & {
  id: string;
  user_id: string;
  company_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  category_id: string | null;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  due_date: string | null;
  status: TransactionStatus;
  payment_method: string | null;
  notes: string | null;
  is_recurring: boolean;
  scope: TransactionScope;
};

export type VaultMeta = Timestamps & {
  user_id: string;
  salt: string;
  verifier_iv: string;
  verifier_ct: string;
};

export type VaultItem = Timestamps & {
  id: string;
  user_id: string;
  title: string;
  username: string | null;
  url: string | null;
  category: string | null;
  notes: string | null;
  password_iv: string;
  password_ct: string;
};

export type Installment = {
  id: string;
  user_id: string;
  credit_card_id: string;
  description: string;
  total_amount: number;
  installments_count: number;
  installments_paid: number;
  first_due_date: string;
  created_at: string;
};

export type Goal = Timestamps & {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: GoalStatus;
  icon: string | null;
  color: string | null;
};

export type Investment = Timestamps & {
  id: string;
  user_id: string;
  name: string;
  type: InvestmentType;
  invested_amount: number;
  current_amount: number;
  quantity: number | null;
  broker: string | null;
  purchase_date: string | null;
};

export type Employee = Timestamps & {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  role: string | null;
  salary: number;
  commission: number | null;
  payment_day: number | null;
  active: boolean;
};

export type Subscription = Timestamps & {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  amount: number;
  cycle: SubscriptionCycle;
  next_charge_date: string;
  category: string | null;
  active: boolean;
};

export type Report = {
  id: string;
  user_id: string;
  title: string;
  type: string;
  period_start: string | null;
  period_end: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
};

type TableDef<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      companies: TableDef<Company>;
      categories: TableDef<Category>;
      bank_accounts: TableDef<BankAccount>;
      credit_cards: TableDef<CreditCard>;
      transactions: TableDef<Transaction>;
      installments: TableDef<Installment>;
      goals: TableDef<Goal>;
      investments: TableDef<Investment>;
      employees: TableDef<Employee>;
      subscriptions: TableDef<Subscription>;
      reports: TableDef<Report>;
      notifications: TableDef<Notification>;
      kyc: TableDef<Kyc>;
      vault_meta: TableDef<VaultMeta>;
      vault_items: TableDef<VaultItem>;
    };
    Views: Record<string, never>;
    Functions: {
      seed_default_categories: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
};
