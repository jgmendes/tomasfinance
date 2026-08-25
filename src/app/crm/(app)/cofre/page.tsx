"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/app/confirm-provider";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  randomSaltB64, deriveKey, encryptText, decryptText, generatePassword, VAULT_VERIFIER,
} from "@/lib/vault-crypto";
import {
  KeyRound, Lock, Loader2, Plus, Copy, Eye, EyeOff, Trash2, ShieldCheck, RefreshCw, ExternalLink,
} from "lucide-react";
import type { VaultItem, VaultMeta } from "@/lib/database.types";

const emptyForm = { id: "", title: "", username: "", url: "", category: "", password: "", notes: "" };

export default function CofrePage() {
  const supabase = createClient();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [meta, setMeta] = useState<VaultMeta | null>(null);
  const [key, setKey] = useState<CryptoKey | null>(null); // só em memória

  // formulários de senha-mestra
  const [master, setMaster] = useState("");
  const [master2, setMaster2] = useState("");
  const [busy, setBusy] = useState(false);

  // itens
  const [items, setItems] = useState<VaultItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("vault_meta").select("*").eq("user_id", user.id).maybeSingle();
      setMeta(data as VaultMeta | null);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadItems() {
    const { data } = await supabase.from("vault_items").select("*").order("title");
    setItems((data ?? []) as VaultItem[]);
  }

  // Criar senha-mestra (primeira vez)
  async function createMaster(e: React.FormEvent) {
    e.preventDefault();
    if (master.length < 8) return toast.error("A senha-mestra deve ter ao menos 8 caracteres");
    if (master !== master2) return toast.error("As senhas não conferem");
    setBusy(true);
    try {
      const salt = randomSaltB64();
      const k = await deriveKey(master, salt);
      const { iv, ct } = await encryptText(k, VAULT_VERIFIER);
      const { error } = await supabase.from("vault_meta").insert({
        user_id: userId, salt, verifier_iv: iv, verifier_ct: ct,
      });
      if (error) throw error;
      setKey(k);
      setMeta({ user_id: userId, salt, verifier_iv: iv, verifier_ct: ct } as VaultMeta);
      setMaster(""); setMaster2("");
      await loadItems();
      toast.success("Cofre criado e desbloqueado!");
    } catch (err: any) {
      toast.error("Erro ao criar cofre", { description: err?.message });
    } finally {
      setBusy(false);
    }
  }

  // Desbloquear
  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!meta) return;
    setBusy(true);
    try {
      const k = await deriveKey(master, meta.salt);
      const check = await decryptText(k, meta.verifier_iv, meta.verifier_ct).catch(() => null);
      if (check !== VAULT_VERIFIER) {
        toast.error("Senha-mestra incorreta");
        return;
      }
      setKey(k);
      setMaster("");
      await loadItems();
    } catch {
      toast.error("Senha-mestra incorreta");
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    setKey(null);
    setRevealed({});
    setItems([]);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!key) return;
    if (!form.title || !form.password) return toast.error("Preencha título e senha");
    setBusy(true);
    try {
      const { iv, ct } = await encryptText(key, form.password);
      const payload = {
        user_id: userId,
        title: form.title,
        username: form.username || null,
        url: form.url || null,
        category: form.category || null,
        notes: form.notes || null,
        password_iv: iv,
        password_ct: ct,
      };
      const res = form.id
        ? await supabase.from("vault_items").update(payload).eq("id", form.id)
        : await supabase.from("vault_items").insert(payload);
      if (res.error) throw res.error;
      toast.success("Senha salva!");
      setOpen(false);
      setForm(emptyForm);
      await loadItems();
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err?.message });
    } finally {
      setBusy(false);
    }
  }

  async function reveal(item: VaultItem) {
    if (!key) return;
    if (revealed[item.id]) {
      setRevealed((p) => { const n = { ...p }; delete n[item.id]; return n; });
      return;
    }
    try {
      const pw = await decryptText(key, item.password_iv, item.password_ct);
      setRevealed((p) => ({ ...p, [item.id]: pw }));
    } catch {
      toast.error("Não foi possível decifrar (senha-mestra trocada?)");
    }
  }

  async function copyPassword(item: VaultItem) {
    if (!key) return;
    try {
      const pw = revealed[item.id] ?? (await decryptText(key, item.password_iv, item.password_ct));
      await navigator.clipboard.writeText(pw);
      toast.success("Senha copiada!");
    } catch {
      toast.error("Erro ao copiar");
    }
  }

  async function remove(item: VaultItem) {
    const ok = await confirm({ title: "Excluir senha", description: `Remover "${item.title}" do cofre?` });
    if (!ok) return;
    const { error } = await supabase.from("vault_items").delete().eq("id", item.id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Removido");
    loadItems();
  }

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // 1) Sem cofre ainda → criar senha-mestra
  if (!meta) {
    return (
      <div className="max-w-md">
        <PageHeader title="Cofre de Senhas" description="Crie sua senha-mestra para proteger o cofre" />
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-primary/5 p-3 text-sm">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
              <p>Suas senhas são cifradas no seu navegador. A senha-mestra <strong>não é salva</strong> — se esquecê-la, não há como recuperar o cofre.</p>
            </div>
            <form onSubmit={createMaster} className="space-y-4">
              <div className="grid gap-2">
                <Label>Senha-mestra</Label>
                <Input type="password" value={master} onChange={(e) => setMaster(e.target.value)} placeholder="Mínimo 8 caracteres" required />
              </div>
              <div className="grid gap-2">
                <Label>Confirmar senha-mestra</Label>
                <Input type="password" value={master2} onChange={(e) => setMaster2(e.target.value)} required />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar cofre
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2) Cofre existe mas bloqueado → desbloquear
  if (!key) {
    return (
      <div className="max-w-md">
        <PageHeader title="Cofre de Senhas" description="Desbloqueie com sua senha-mestra" />
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 grid place-items-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <form onSubmit={unlock} className="space-y-4">
              <div className="grid gap-2">
                <Label>Senha-mestra</Label>
                <Input type="password" value={master} onChange={(e) => setMaster(e.target.value)} autoFocus required />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Desbloquear
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3) Desbloqueado → lista
  return (
    <div>
      <PageHeader title="Cofre de Senhas" description="Suas senhas cifradas de ponta a ponta">
        <Button variant="outline" onClick={lock}><Lock className="h-4 w-4" /> Bloquear</Button>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(emptyForm)}><Plus className="h-4 w-4" /> Nova senha</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} senha</DialogTitle></DialogHeader>
            <form onSubmit={saveItem} className="space-y-4">
              <div className="grid gap-2"><Label>Título</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Gmail, Banco..." required /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Usuário / e-mail</Label>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Categoria</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Banco, Social..." /></div>
              </div>
              <div className="grid gap-2"><Label>URL</Label>
                <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" /></div>
              <div className="grid gap-2"><Label>Senha</Label>
                <div className="flex gap-2">
                  <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  <Button type="button" variant="outline" size="icon" title="Gerar senha forte"
                    onClick={() => setForm({ ...form, password: generatePassword() })}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2"><Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={KeyRound} title="Cofre vazio" description="Adicione sua primeira senha com o botão acima." />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 font-bold text-primary">
                    {item.title[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.username || "—"} {item.category ? `· ${item.category}` : ""}
                    </p>
                    {revealed[item.id] && (
                      <p className="mt-1 font-mono text-sm">{revealed[item.id]}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.url && (
                    <Button size="icon" variant="ghost" asChild title="Abrir site">
                      <a href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => reveal(item)} title="Mostrar/ocultar">
                    {revealed[item.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => copyPassword(item)} title="Copiar senha">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item)} title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
