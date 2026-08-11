import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tomaz Finanças — Seu CFO Virtual";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0a14 0%, #1a0f2e 55%, #0a0a14 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Tomaz Finanças</div>
        </div>

        <div style={{ display: "flex", marginTop: 56, fontSize: 62, fontWeight: 800, lineHeight: 1.15, maxWidth: 980 }}>
          Controle financeiro inteligente para você e suas empresas
        </div>

        <div style={{ display: "flex", marginTop: 28, fontSize: 28, color: "#c4b5fd", maxWidth: 860 }}>
          Receitas, despesas, patrimônio e CFO Virtual com IA — tudo em um só lugar.
        </div>
      </div>
    ),
    { ...size }
  );
}
