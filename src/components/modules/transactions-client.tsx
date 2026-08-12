"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useConfirm } from "@/components/app/confirm-provider";
import { formatCurrency, formatDate, currentMonthRange } from "@/lib/utils";
import { suggestCategory } from "@/lib/categorize";
import { transactionSchema, beneficiarySchema, firstError } from "@/lib/schemas";
import { Loader2, Plus, Trash2, TrendingUp, TrendingDown, Pencil, Search, X, FileCheck, FileX, UserCheck, Paperclip, Download } from "lucide-react";
import type {
  BankAccount,
  Beneficiary,
  Category,
  Company,
  Transaction,
  TransactionStatus,
  TransactionType,
  TransactionScope,
} from "@/lib/database.types";

const NEW_BENEFICIARY = "__new__";

const STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: "pago", label: "Pago" },
  { value: "recebido", label: "Recebido" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

const PAYMENT_METHODS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Boleto", "Transferência"];

interface Props {
  type: TransactionType;
}

const emptyForm = {
  id: "",
  description: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  category_id: "",
  account_id: "",
  company_id: "",
  status: "pago" as TransactionStatus,
  payment_method: "",
  notes: "",
  scope: "pessoal" as TransactionScope,
  reason: "",
  invoice_issued: "" as "" | "sim" | "nao",
  invoice_number: "",
  beneficiary_id: "",
  receipt_path: "",
};

const RECEIPTS_BUCKET = "comprovantes";

const emptyBeneficiaryForm = { name: "", document: "" };

export function TransactionsClient({ type }: Props) {
  const supabase = createClient();
  const confirm = useConfirm();
  const isReceita = type === "receita";

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterScope, setFilterScope] = useState<"all" | TransactionScope>("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [beneficiaryDialogOpen, setBeneficiaryDialogOpen] = useState(false);
  const [beneficiaryForm, setBeneficiaryForm] = useState(emptyBeneficiaryForm);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [items, setItems] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  async function load() {
    setLoading(true);
    const [tx, cat, acc, comp, ben] = await Promise.all([
      supabase.from("transactions").select("*").eq("type", type).order("date", { ascending: false }),
      supabase.from("categories").select("*").eq("type", type).order("name"),
      supabase.from("bank_accounts").select("*").order("name"),
      supabase.from("companies").select("*").order("name"),
      supabase.from("beneficiaries").select("*").order("name"),
    ]);
    setItems((tx.data ?? []) as Transaction[]);
    setCategories((cat.data ?? []) as Category[]);
    setAccounts((acc.data ?? []) as BankAccount[]);
    setCompanies((comp.data ?? []) as Company[]);
    setBeneficiaries((ben.data ?? []) as Beneficiary[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const catNames = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const beneficiaryNames = useMemo(
    () => Object.fromEntries(beneficiaries.map((b) => [b.id, b.name])),
    [beneficiaries]
  );

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filterCategory !== "all" && t.category_id !== filterCategory) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterScope !== "all" && (t.scope ?? "pessoal") !== filterScope) return false;
      return true;
    });
  }, [items, search, filterCategory, filterStatus, filterScope]);

  const hasFilters = search !== "" || filterCategory !== "all" || filterStatus !== "all";
  function clearFilters() {
    setSearch("");
    setFilterCategory("all");
    setFilterStatus("all");
  }

  const { start, end } = currentMonthRange();
  const totalMes = filtered
    .filter((t) => t.date >= start && t.date <= end)
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalGeral = filtered.reduce((s, t) => s + Number(t.amount), 0);

  function openNew() {
    setForm({ ...emptyForm, status: isReceita ? "recebido" : "pago" });
    setReceiptFile(null);
    setOpen(true);
  }

  function openEdit(t: Transaction) {
    setForm({
      id: t.id,
      description: t.description,
      amount: String(t.amount),
      date: t.date,
      category_id: t.category_id ?? "",
      account_id: t.account_id ?? "",
      company_id: t.company_id ?? "",
      status: t.status,
      payment_method: t.payment_method ?? "",
      notes: t.notes ?? "",
      scope: t.scope ?? "pessoal",
      reason: t.reason ?? "",
      invoice_issued: t.invoice_issued == null ? "" : t.invoice_issued ? "sim" : "nao",
      invoice_number: t.invoice_number ?? "",
      beneficiary_id: t.beneficiary_id ?? "",
      receipt_path: t.receipt_path ?? "",
    });
    setReceiptFile(null);
    setOpen(true);
  }

  /** Gera um link temporário e abre o comprovante em nova aba. */
  async function downloadReceipt(path: string, id: string) {
    setDownloadingId(id);
    const { data, error } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, 60);
    setDownloadingId(null);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao baixar comprovante", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  function onBeneficiarySelect(v: string) {
    if (v === NEW_BENEFICIARY) {
      setBeneficiaryForm(emptyBeneficiaryForm);
      setBeneficiaryDialogOpen(true);
      return;
    }
    setForm({ ...form, beneficiary_id: v });
  }

  async function saveBeneficiary(e: React.FormEvent) {
    e.preventDefault();
    const validationError = firstError(beneficiarySchema, beneficiaryForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSavingBeneficiary(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSavingBeneficiary(false);
      return;
    }
    const { data, error } = await supabase
      .from("beneficiaries")
      .insert({
        user_id: user.id,
        name: beneficiaryForm.name.trim(),
        document: beneficiaryForm.document.trim() || null,
      })
      .select()
      .single();
    setSavingBeneficiary(false);
    if (error || !data) {
      toast.error("Erro ao cadastrar beneficiário", { description: error?.message });
      return;
    }
    setBeneficiaries((prev) => [...prev, data as Beneficiary].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((prev) => ({ ...prev, beneficiary_id: data.id }));
    setBeneficiaryDialogOpen(false);
    toast.success("Beneficiário cadastrado!");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const validationError = firstError(transactionSchema, {
      description: form.description,
      amount: form.amount,
      date: form.date,
      reason: form.reason,
      invoice_issued: form.invoice_issued,
      beneficiary_id: form.beneficiary_id,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      type,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      category_id: form.category_id || null,
      account_id: form.account_id || null,
      company_id: form.company_id || null,
      status: form.status,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
      scope: form.scope,
      reason: form.reason.trim(),
      invoice_issued: form.invoice_issued === "sim",
      invoice_number: form.invoice_issued === "sim" ? form.invoice_number.trim() || null : null,
      beneficiary_id: form.beneficiary_id,
    };

    const res = form.id
      ? await supabase.from("transactions").update(payload).eq("id", form.id).select().single()
      : await supabase.from("transactions").insert(payload).select().single();

    if (res.error || !res.data) {
      setSaving(false);
      toast.error("Erro ao salvar", { description: res.error?.message });
      return;
    }

    // Envia o comprovante (se selecionado) só depois de garantir o id da transação.
    if (receiptFile) {
      const transactionId = res.data.id as string;
      const ext = receiptFile.name.split(".").pop();
      const path = `${user.id}/${transactionId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(path, receiptFile, { upsert: true });
      if (uploadError) {
        setSaving(false);
        toast.error("Salvo, mas o comprovante não foi enviado", { description: uploadError.message });
        setOpen(false);
        load();
        return;
      }
      await supabase.from("transactions").update({ receipt_path: path }).eq("id", transactionId);
    }

    setSaving(false);
    toast.success(form.id ? "Atualizado!" : "Cadastrado!");
    setReceiptFile(null);
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Excluir movimentação",
      description: "Tem certeza? Esta ação não pode ser desfeita.",
    });
    if (!ok) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído");
    load();
  }

  return (
    <div>
      <PageHeader
        title={isReceita ? "Receitas" : "Despesas"}
        description={
          isReceita
            ? "Cadastre e acompanhe suas entradas"
            : "Cadastre e acompanhe suas saídas"
        }
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nova {isReceita ? "receita" : "despesa"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {form.id ? "Editar" : "Nova"} {isReceita ? "receita" : "despesa"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => {
                    const description = e.target.value;
                    setForm((prev) => {
                      let category_id = prev.category_id;
                      if (!category_id) {
                        const name = suggestCategory(description, type);
                        const match = name && categories.find((c) => c.name === name);
                        if (match) category_id = match.id;
                      }
                      return { ...prev, description, category_id };
                    });
                  }}
                  placeholder={isReceita ? "Ex: Salário, Venda..." : "Ex: Aluguel, Mercado..."}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  💡 A categoria é sugerida automaticamente pela descrição.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Valor</Label>
                  <CurrencyInput
                    value={form.amount}
                    onValueChange={(v) => setForm({ ...form, amount: v })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => setForm({ ...form, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Conta</Label>
                  <Select
                    value={form.account_id}
                    onValueChange={(v) => setForm({ ...form, account_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as TransactionStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{isReceita ? "Empresa" : "Forma de pagamento"}</Label>
                  {isReceita ? (
                    <Select
                      value={form.company_id}
                      onValueChange={(v) => setForm({ ...form, company_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pessoal" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={form.payment_method}
                      onValueChange={(v) => setForm({ ...form, payment_method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Tipo de movimentação</Label>
                <Select
                  value={form.scope}
                  onValueChange={(v) => setForm({ ...form, scope: v as TransactionScope })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pessoal">Pessoal</SelectItem>
                    <SelectItem value="empresarial">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Motivo deste valor</Label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Explique o motivo deste valor (obrigatório para o histórico financeiro/fiscal)"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Beneficiário</Label>
                  <Select value={form.beneficiary_id} onValueChange={onBeneficiarySelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Quem recebeu/originou o valor" />
                    </SelectTrigger>
                    <SelectContent>
                      {beneficiaries.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_BENEFICIARY}>+ Novo beneficiário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Emitiu nota fiscal?</Label>
                  <Select
                    value={form.invoice_issued}
                    onValueChange={(v) => setForm({ ...form, invoice_issued: v as "sim" | "nao" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.invoice_issued === "sim" && (
                <div className="grid gap-2">
                  <Label>Número da nota fiscal</Label>
                  <Input
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Comprovante (ex.: comprovante bancário)</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                {form.receipt_path && !receiptFile && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" /> Já tem um comprovante anexado — escolha outro arquivo pra substituir.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={beneficiaryDialogOpen} onOpenChange={setBeneficiaryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo beneficiário</DialogTitle>
            </DialogHeader>
            <form onSubmit={saveBeneficiary} className="space-y-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input
                  value={beneficiaryForm.name}
                  onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, name: e.target.value })}
                  placeholder="Ex: João da Silva ou Fornecedor LTDA"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>CPF/CNPJ</Label>
                <Input
                  value={beneficiaryForm.document}
                  onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, document: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={savingBeneficiary}>
                  {savingBeneficiary && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar beneficiário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs
        value={filterScope}
        onValueChange={(v) => setFilterScope(v as "all" | TransactionScope)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
          <TabsTrigger value="empresarial">Empresarial</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          title={`Total do mês`}
          value={formatCurrency(totalMes)}
          icon={isReceita ? TrendingUp : TrendingDown}
          accent={isReceita ? "text-emerald-500" : "text-red-500"}
          iconBg={isReceita ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
        <StatCard
          title="Total geral"
          value={formatCurrency(totalGeral)}
          icon={isReceita ? TrendingUp : TrendingDown}
          accent="text-muted-foreground"
          iconBg="bg-muted"
        />
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição..."
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4" /> Limpar
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={isReceita ? TrendingUp : TrendingDown}
              title={
                items.length === 0
                  ? `Nenhuma ${isReceita ? "receita" : "despesa"} cadastrada`
                  : "Nenhum resultado para os filtros"
              }
              description={
                items.length === 0
                  ? "Clique no botão acima para adicionar a primeira."
                  : "Tente ajustar a busca ou os filtros."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Beneficiário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2" title={t.reason ?? undefined}>
                        {t.description}
                        <Badge variant="outline" className="hidden text-[10px] capitalize sm:inline-flex">
                          {t.scope ?? "pessoal"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {catNames[t.category_id ?? ""] ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">
                          {beneficiaryNames[t.beneficiary_id ?? ""] ?? "—"}
                        </span>
                        {t.invoice_issued ? (
                          <FileCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <FileX className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(t.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ["pago", "recebido"].includes(t.status)
                            ? "success"
                            : t.status === "atrasado"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={
                        isReceita
                          ? "text-right font-semibold text-emerald-500"
                          : "text-right font-semibold text-red-500"
                      }
                    >
                      {formatCurrency(Number(t.amount))}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {t.receipt_path && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Baixar comprovante"
                            disabled={downloadingId === t.id}
                            onClick={() => downloadReceipt(t.receipt_path as string, t.id)}
                          >
                            {downloadingId === t.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => remove(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
