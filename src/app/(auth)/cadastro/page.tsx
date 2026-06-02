"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..4
}

const STRENGTH = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
const STRENGTH_COLOR = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const score = useMemo(() => passwordScore(password), [password]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Informe seu nome completo");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast.error("E-mail inválido");
    if (password.length < 8) return toast.error("A senha deve ter ao menos 8 caracteres");
    if (score < 2) return toast.error("Escolha uma senha mais forte");
    if (password !== confirm) return toast.error("As senhas não conferem");
    if (!accepted) return toast.error("Aceite os termos para continuar");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error("Erro ao criar conta", { description: error.message });
        return;
      }
      if (data.user) {
        await supabase.rpc("seed_default_categories", { p_user_id: data.user.id });
      }
      if (data.session) {
        toast.success("Conta criada com sucesso!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.success("Conta criada! Confira seu e-mail para confirmar o acesso.");
        router.push("/login");
      }
    } catch (err) {
      toast.error("Erro inesperado", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Criar sua conta</h1>
        <p className="text-sm text-muted-foreground">
          Leva menos de 1 minuto. Comece a organizar suas finanças agora.
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="pr-10"
              required
            />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn("h-1 flex-1 rounded-full", i < score ? STRENGTH_COLOR[score] : "bg-muted")} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Força: {STRENGTH[score]}</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input id="confirm" type={show ? "text" : "password"} value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" required />
          {confirm && confirm !== password && (
            <p className="text-xs text-destructive">As senhas não conferem</p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <button type="button" onClick={() => setAccepted(!accepted)}
            className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border",
              accepted ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
            {accepted && <Check className="h-3 w-3" />}
          </button>
          <span className="text-muted-foreground">
            Li e aceito os Termos de Uso e a Política de Privacidade.
          </span>
        </label>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar conta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
