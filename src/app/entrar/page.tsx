import { Suspense } from "react";
import { FormularioEntrada } from "@/components/formulario-entrada";
import { SeletorIdioma } from "@/components/idioma/seletor";
import { i18nPedido } from "@/server/idioma";
import { ptPT } from "@/lib/i18n";

async function CabecalhoEntrada() {
  const { t } = await i18nPedido();
  return (
    <header className="flex h-12 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
          VC
        </span>
        <p className="text-[13px]/5 font-semibold tracking-tight">{t("marca.nome")}</p>
      </div>
      <SeletorIdioma />
    </header>
  );
}

export default function PaginaEntrar() {
  return (
    <main className="min-h-full bg-background">
      <Suspense
        fallback={
          <header className="flex h-12 items-center border-b border-border px-4">
            <p className="text-[13px]/5 font-semibold">{ptPT.marca.nome}</p>
          </header>
        }
      >
        <CabecalhoEntrada />
      </Suspense>
      <Suspense>
        <FormularioEntrada />
      </Suspense>
    </main>
  );
}
