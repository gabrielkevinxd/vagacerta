import { Suspense } from "react";
import { FormularioEntrada } from "@/components/formulario-entrada";
import { SeletorIdioma } from "@/components/idioma/seletor";
import { i18nPedido } from "@/server/idioma";
import { ptPT } from "@/lib/i18n";

async function CabecalhoEntrada() {
  const { t } = await i18nPedido();
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <p className="font-heading text-xl">{t("marca.nome")}</p>
      <SeletorIdioma />
    </header>
  );
}

export default function PaginaEntrar() {
  return (
    <main>
      <Suspense
        fallback={
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="font-heading text-xl">{ptPT.marca.nome}</p>
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
