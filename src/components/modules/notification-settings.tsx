"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getPermission,
  isIOS,
  isStandalone,
  notificationsSupported,
  requestNotificationPermission,
  showLocalNotification,
} from "@/lib/push";
import { Bell, BellRing, Share, Smartphone } from "lucide-react";

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(true);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    setSupported(notificationsSupported());
    setPermission(getPermission());
    // No iPhone, notificações só funcionam com o app instalado na Tela de Início.
    setIosNeedsInstall(isIOS() && !isStandalone());
  }, []);

  async function enable() {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      toast.success("Notificações ativadas!");
      showLocalNotification(
        "Tomaz Finanças 🔔",
        "Pronto! Você receberá alertas de contas, metas e saldo aqui."
      );
    } else {
      toast.error("Permissão negada. Ative nas configurações do navegador.");
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Seu navegador não suporta notificações.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {iosNeedsInstall && (
        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">Instale o app no iPhone primeiro</p>
            <p className="mt-1 text-muted-foreground">
              No Safari, toque em <Share className="inline h-3.5 w-3.5" />{" "}
              <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>.
              Depois abra o app pela tela inicial e ative as notificações por aqui.
              (Requer iOS 16.4 ou superior.)
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          {permission === "granted" ? (
            <BellRing className="h-5 w-5 text-emerald-500" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">Alertas no dispositivo</p>
            <p className="text-xs text-muted-foreground">
              Contas vencendo, metas atingidas, saldo baixo e faturas.
            </p>
          </div>
        </div>
        {permission === "granted" ? (
          <Badge variant="success">Ativado</Badge>
        ) : permission === "denied" ? (
          <Badge variant="destructive">Bloqueado</Badge>
        ) : (
          <Button onClick={enable} disabled={iosNeedsInstall}>
            <Bell className="h-4 w-4" /> Ativar
          </Button>
        )}
      </div>

      {permission === "denied" && (
        <p className="text-xs text-muted-foreground">
          As notificações estão bloqueadas. Habilite nas configurações do
          navegador/dispositivo para este site.
        </p>
      )}
    </div>
  );
}
