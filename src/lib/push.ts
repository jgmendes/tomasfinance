// Helpers de notificação local. Funciona no app instalado (PWA), inclusive
// no iPhone com iOS 16.4+ quando adicionado à Tela de Início.

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission {
  if (!notificationsSupported()) return "denied";
  return Notification.permission;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Detecta se está rodando como app instalado (standalone). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Mostra uma notificação local (preferindo o service worker, exigido no iOS). */
export async function showLocalNotification(
  title: string,
  body?: string,
  link?: string
) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: link ?? "/dashboard" },
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch {
    // silencioso
  }
}
