"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sumByType } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download, FileDown, Loader2, TrendingUp, TrendingDown, PiggyBank, ShieldCheck } from "lucide-react";
import type { AuditLog, Category, Transaction } from "@/lib/database.types";

const AUDIT_ACTION_LABEL: Record<string, string> = {
  transaction_created: "Lançamento criado",
  transaction_updated: "Lançamento editado",
  transaction_deleted: "Lançamento excluído",
};

export default function RelatoriosPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));

  // Categorias e auditoria só mudam de página em página; carrega uma vez.
  useEffect(() => {
    (async () => {
      const [cat, audit] = await Promise.all([
        supabase.from("categories").select("*"),
        supabase
          .from("audit_logs")
          .select("*")
          .eq("entity", "transactions")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      setCategories((cat.data ?? []) as Category[]);
      setAuditLogs((audit.data ?? []) as AuditLog[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transações: busca só o período selecionado (evita trazer o histórico
  // inteiro do usuário toda vez que a página abre ou o período muda).
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });
      setTransactions((data ?? []) as Transaction[]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  const catNames = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  // Já vem filtrado do banco pelo período; mantém o nome para o resto do arquivo.
  const filtered = transactions;

  const receitas = sumByType(filtered, "receita");
  const despesas = sumByType(filtered, "despesa");
  const lucro = receitas - despesas;

  // DRE simplificado por categoria
  const dre = useMemo(() => {
    const rec = new Map<string, number>();
    const desp = new Map<string, number>();
    filtered.forEach((t) => {
      const name = catNames[t.category_id ?? ""] ?? "Sem categoria";
      const map = t.type === "receita" ? rec : desp;
      map.set(name, (map.get(name) ?? 0) + Number(t.amount));
    });
    return {
      receitas: Array.from(rec.entries()).sort((a, b) => b[1] - a[1]),
      despesas: Array.from(desp.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [filtered, catNames]);

  async function exportPDF() {
    // jsPDF + autotable só são baixados quando o usuário realmente exporta
    // (evitam ~140kB no carregamento inicial da página).
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(124, 58, 237);
    doc.text("Tomaz Finanças — Relatório", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Período: ${formatDate(start)} a ${formatDate(end)}`, 14, 26);
    doc.text(`Receitas: ${formatCurrency(receitas)}`, 14, 32);
    doc.text(`Despesas: ${formatCurrency(despesas)}`, 80, 32);
    doc.text(`Resultado: ${formatCurrency(lucro)}`, 145, 32);

    autoTable(doc, {
      startY: 38,
      head: [["Data", "Descrição", "Categoria", "Tipo", "Valor"]],
      body: filtered.map((t) => [
        formatDate(t.date),
        t.description,
        catNames[t.category_id ?? ""] ?? "—",
        t.type === "receita" ? "Receita" : "Despesa",
        formatCurrency(Number(t.amount)),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [124, 58, 237] },
      columnStyles: { 4: { halign: "right" } },
    });

    doc.save(`relatorio_${start}_a_${end}.pdf`);
  }

  function exportCSV(sep = ",", ext = "csv") {
    const header = ["Data", "Tipo", "Descrição", "Categoria", "Status", "Valor"];
    const rows = filtered.map((t) => [
      t.date,
      t.type,
      `"${t.description.replace(/"/g, '""')}"`,
      catNames[t.category_id ?? ""] ?? "",
      t.status,
      String(t.amount).replace(".", sep === ";" ? "," : "."),
    ]);
    const content = [header, ...rows].map((r) => r.join(sep)).join("\n");
    const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${start}_a_${end}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Relatórios" description="Gere e exporte relatórios financeiros">
        <Button variant="outline" onClick={() => exportCSV(",", "csv")}>
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" onClick={() => exportCSV(";", "xls")}>
          <Download className="h-4 w-4" /> Excel
        </Button>
        <Button onClick={exportPDF}>
          <FileDown className="h-4 w-4" /> PDF
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4 p-5">
          <div className="grid gap-2">
            <Label>De</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Até</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {filtered.length} movimentações no período
          </p>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Total de receitas" value={formatCurrency(receitas)} icon={TrendingUp} accent="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard title="Total de despesas" value={formatCurrency(despesas)} icon={TrendingDown} accent="text-red-500" iconBg="bg-red-500/10" />
        <StatCard
          title="Resultado (DRE)"
          value={formatCurrency(lucro)}
          icon={PiggyBank}
          accent={lucro >= 0 ? "text-emerald-500" : "text-red-500"}
          iconBg={lucro >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demonstrativo de Receitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dre.receitas.map(([name, value]) => (
              <div key={name} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-medium text-emerald-500">{formatCurrency(value)}</span>
              </div>
            ))}
            {dre.receitas.length === 0 && <p className="text-sm text-muted-foreground">Sem receitas no período.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Demonstrativo de Despesas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dre.despesas.map(([name, value]) => (
              <div key={name} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-medium text-red-500">{formatCurrency(value)}</span>
              </div>
            ))}
            {dre.despesas.length === 0 && <p className="text-sm text-muted-foreground">Sem despesas no período.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Detalhamento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell className="text-muted-foreground">{catNames[t.category_id ?? ""] ?? "—"}</TableCell>
                  <TableCell className="capitalize">{t.type}</TableCell>
                  <TableCell className={t.type === "receita" ? "text-right text-emerald-500" : "text-right text-red-500"}>
                    {formatCurrency(Number(t.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Trilha de auditoria
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Todo lançamento criado, editado ou excluído é registrado automaticamente pelo banco de dados — só leitura, ninguém (nem você) consegue apagar ou alterar este histórico.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro de auditoria ainda.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span>{AUDIT_ACTION_LABEL[log.action] ?? log.action}</span>
                <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
