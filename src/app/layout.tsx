import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { ProvedorIdioma } from "@/components/idioma/provedor";
import { IDIOMA_OMISSAO, mensagensDe, ptPT } from "@/lib/i18n";
import { lerIdiomaPedido } from "@/server/idioma";
import "./globals.css";

const source = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
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
    <html lang={IDIOMA_OMISSAO} className={`${source.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <Suspense
          fallback={
            <p className="px-4 py-10 text-sm text-muted-foreground" role="status">
              {ptPT.carregar.seccao}
            </p>
          }
        >
          <IdiomaRaiz>{children}</IdiomaRaiz>
        </Suspense>
      </body>
    </html>
  );
}
