"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/app/logo";
import { Loader2, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Não foi possível entrar", { description: error.message });
        return;
      }
      // Verifica se é admin
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id ?? "")
        .single();
      const role = (data as { role: string | null } | null)?.role;
      if (role !== "admin") {
        await supabase.auth.signOut();
        toast.error("Acesso negado", { description: "Esta conta não é de administrador." });
        return;
      }
      toast.success("Bem-vindo, admin!");
      router.push("/crm/admin");
      router.refresh();
    } catch (err) {
      toast.error("Erro ao entrar", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-slate-950 p-6 text-white">
      <Card className="w-full max-w-sm border-white/10 bg-slate-900 text-white">
        <CardContent className="p-6">
          <div className="mb-6 grid place-items-center gap-3 text-center">
            <div className="rounded-xl bg-white/10 p-2">
              <LogoMark className="h-9 w-9" />
            </div>
            <div>
              <h1 className="flex items-center justify-center gap-2 text-xl font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" /> Painel Admin
              </h1>
              <p className="text-sm text-slate-400">Acesso restrito a administradores</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500"
                placeholder="admin@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
