// Integração com a Bravive Banking — SOMENTE SERVIDOR.
// Nunca importe este arquivo em componentes client.

const BASE = process.env.BRAVIVE_API_URL || "https://api.bravive.com";

export function isBraviveConfigured(): boolean {
  return !!(process.env.BRAVIVE_CLIENT_ID && process.env.BRAVIVE_SECRET);
}

function authHeader(): string {
  const id = process.env.BRAVIVE_CLIENT_ID;
  const secret = process.env.BRAVIVE_SECRET;
  if (!id || !secret) throw new Error("Bravive não configurada (env vars ausentes).");
  const token = Buffer.from(`${id}:${secret}`).toString("base64");
  return `Bearer ${token}`;
}

export interface PixCharge {
  id: string;
  code: string; // EMV copia e cola
  qrcode: string; // PNG base64
}

/** Gera uma cobrança PIX (QR Code). amountCents em centavos. */
export async function createPixCharge(
  amountCents: number,
  description: string,
  webhookUrl?: string
): Promise<PixCharge> {
  const res = await fetch(`${BASE}/api/v1/pix/qrcode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: amountCents,
      description,
      ...(webhookUrl ? { webhookUrl } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bravive PIX falhou (${res.status}): ${text}`);
  }
  return res.json();
}

/** Consulta saldo (em centavos). */
export async function getBalance(): Promise<{ available: number; blocked: number }> {
  const res = await fetch(`${BASE}/api/v1/balance`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) throw new Error(`Bravive balance falhou (${res.status})`);
  return res.json();
}
