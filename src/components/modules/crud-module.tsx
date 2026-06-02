"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
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
import { Card } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useConfirm } from "@/components/app/confirm-provider";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FieldType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "textarea"
  | "select";

export interface FieldConfig {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  span2?: boolean;
  step?: string;
}

export interface CrudActions {
  edit: () => void;
  remove: () => void;
}

interface CrudModuleProps<T> {
  title: string;
  description?: string;
  table: string;
  icon: LucideIcon;
  fields: FieldConfig[];
  defaultValues: Record<string, any>;
  orderBy?: string;
  ascending?: boolean;
  /** Render de cada item como card. */
  renderCard: (item: T, actions: CrudActions, extra?: any) => React.ReactNode;
  /** Rodapé opcional do card (ex.: botão de aporte). Recebe item e reload. */
  cardFooter?: (item: T, reload: () => void) => React.ReactNode;
  /** Faixa de estatísticas no topo. */
  renderStats?: (items: T[], extra?: any) => React.ReactNode;
  /** Carrega dados auxiliares (ex.: saldos calculados) usados no render. */
  loadExtra?: (supabase: SupabaseClient, items: T[]) => Promise<any>;
  /** Colunas extras carregadas para selects (ex.: empresas). */
  selectSources?: Record<string, { table: string; labelField: string }>;
  newLabel?: string;
  gridClass?: string;
}

const NUMERIC = new Set(["number", "currency"]);

export function CrudModule<T extends { id: string }>({
  title,
  description,
  table,
  icon: Icon,
  fields,
  defaultValues,
  orderBy = "created_at",
  ascending = false,
  renderCard,
  cardFooter,
  renderStats,
  loadExtra,
  selectSources,
  newLabel = "Adicionar",
  gridClass = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
}: CrudModuleProps<T>) {
  const supabase = createClient();
  const confirm = useConfirm();
  const [extra, setExtra] = useState<any>(null);
  // Operações sobre tabela dinâmica (nome em runtime): usamos acesso destipado,
  // pois o supabase-js exige nomes de tabela literais para inferência de tipos.
  const db = supabase as unknown as {
    from: (t: string) => any;
  };
  const [items, setItems] = useState<T[]>([]);
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>(defaultValues);

  async function load() {
    setLoading(true);
    const { data } = await db
      .from(table)
      .select("*")
      .order(orderBy, { ascending });
    const rows = (data ?? []) as T[];
    setItems(rows);

    if (loadExtra) {
      setExtra(await loadExtra(supabase as unknown as SupabaseClient, rows));
    }

    if (selectSources) {
      const entries = await Promise.all(
        Object.entries(selectSources).map(async ([field, src]) => {
          const { data: rows } = await db
            .from(src.table)
            .select(`id, ${src.labelField}`)
            .order(src.labelField);
          return [
            field,
            (rows ?? []).map((r: any) => ({
              value: r.id,
              label: r[src.labelField],
            })),
          ] as const;
        })
      );
      setDynamicOptions(Object.fromEntries(entries));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  function openNew() {
    setForm(defaultValues);
    setOpen(true);
  }

  function openEdit(item: T) {
    const f: Record<string, any> = { id: (item as any).id };
    fields.forEach((field) => {
      const v = (item as any)[field.name];
      f[field.name] = v == null ? "" : String(v);
    });
    setForm(f);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }

    const payload: Record<string, any> = { user_id: user.id };
    fields.forEach((field) => {
      let value = form[field.name];
      if (value === "" || value === undefined) {
        value = null;
      } else if (NUMERIC.has(field.type ?? "text")) {
        value = Number(value);
      }
      payload[field.name] = value;
    });

    const res = form.id
      ? await db.from(table).update(payload).eq("id", form.id)
      : await db.from(table).insert(payload);

    setSaving(false);
    if (res.error) {
      toast.error("Erro ao salvar", { description: res.error.message });
      return;
    }
    toast.success(form.id ? "Atualizado!" : "Cadastrado!");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Excluir item",
      description: "Tem certeza? Esta ação não pode ser desfeita.",
    });
    if (!ok) return;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído");
    load();
  }

  function optionsFor(field: FieldConfig) {
    return field.options ?? dynamicOptions[field.name] ?? [];
  }

  return (
    <div>
      <PageHeader title={title} description={description}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> {newLabel}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar" : newLabel}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <div
                    key={field.name}
                    className={`grid gap-2 ${field.span2 ? "col-span-2" : ""}`}
                  >
                    <Label>{field.label}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        value={form[field.name] ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, [field.name]: e.target.value })
                        }
                        placeholder={field.placeholder}
                      />
                    ) : field.type === "currency" ? (
                      <CurrencyInput
                        value={form[field.name] ?? ""}
                        onValueChange={(v) =>
                          setForm({ ...form, [field.name]: v })
                        }
                      />
                    ) : field.type === "select" ? (
                      <Select
                        value={form[field.name] ?? ""}
                        onValueChange={(v) =>
                          setForm({ ...form, [field.name]: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder ?? "Selecione"} />
                        </SelectTrigger>
                        <SelectContent>
                          {optionsFor(field).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={
                          field.type === "date"
                            ? "date"
                            : NUMERIC.has(field.type ?? "text")
                            ? "number"
                            : "text"
                        }
                        step={field.step ?? (NUMERIC.has(field.type ?? "text") ? "0.01" : undefined)}
                        value={form[field.name] ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, [field.name]: e.target.value })
                        }
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
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
      </PageHeader>

      {!loading && items.length > 0 && renderStats?.(items, extra)}

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Icon}
          title="Nada cadastrado ainda"
          description="Use o botão acima para adicionar o primeiro item."
        />
      ) : (
        <div className={gridClass}>
          {items.map((item) => (
            <Card key={item.id} className="relative p-5">
              {renderCard(
                item,
                {
                  edit: () => openEdit(item),
                  remove: () => remove(item.id),
                },
                extra
              )}
              {cardFooter?.(item, load)}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Botões de ação padrão para o canto do card. */
export function CardActions({ edit, remove }: CrudActions) {
  return (
    <div className="absolute right-3 top-3 flex gap-1">
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={edit}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-destructive"
        onClick={remove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
