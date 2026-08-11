import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/app/sw-register";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const TITLE = "Tomaz Finanças — Seu CFO Virtual";
const DESCRIPTION =
  "Sistema financeiro completo: receitas, despesas, contas, cartões, metas, investimentos, empresas e inteligência financeira com IA.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Tomaz Finanças" },
  description: DESCRIPTION,
  keywords: [
    "controle financeiro",
    "finanças pessoais",
    "gestão financeira empresarial",
    "CFO virtual",
    "fluxo de caixa",
    "dashboard financeiro",
    "app de finanças com IA",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: { capable: true, title: "Tomaz Finanças", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Tomaz Finanças",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ServiceWorkerRegister />
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
