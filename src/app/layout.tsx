import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist_Mono, Inter } from "next/font/google";
import { ProvedorIdioma } from "@/components/idioma/provedor";
import { IDIOMA_OMISSAO, mensagensDe, ptPT } from "@/lib/i18n";
import { lerIdiomaPedido } from "@/server/idioma";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  axes: ["opsz"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: ptPT.meta.titulo,
  description: ptPT.meta.descricao,
};

async function IdiomaRaiz({ children }: { children: React.ReactNode }) {
  const idioma = await lerIdiomaPedido();
  return (
    <ProvedorIdioma idioma={idioma} mensagens={mensagensDe(idioma)}>
      {children}
    </ProvedorIdioma>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={IDIOMA_OMISSAO} className={`${inter.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground">
        <Suspense
          fallback={
            <div className="space-y-3 px-6 py-5" role="status">
              <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            </div>
          }
        >
          <IdiomaRaiz>{children}</IdiomaRaiz>
        </Suspense>
      </body>
    </html>
  );
}
