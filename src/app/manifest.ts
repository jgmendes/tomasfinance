import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tomas Finance",
    short_name: "Tomas",
    description: "Sistema financeiro completo com CFO Virtual e IA.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a14",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Novo lembrete",
        short_name: "Lembrete",
        description: "Criar um lembrete rapidamente pelo chat",
        url: "/lembretes?novo=1",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
