"use client";

import { definirIdiomaAcao } from "@/app/idioma/acao";
import { useT } from "./provedor";
import type { Idioma } from "@/lib/i18n";

export function SeletorIdioma({ compacto = false }: { compacto?: boolean }) {
  const { idioma, t } = useT();
  const botao = (valor: Idioma, rotulo: string, nome: string) => (
    <button
      type="submit"
      name="idioma"
      value={valor}
      aria-pressed={idioma === valor}
      aria-label={nome}
      className={`min-h-8 min-w-9 rounded-md px-2 text-xs font-semibold ${
        idioma === valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {rotulo}
    </button>
  );
  return (
    <form action={definirIdiomaAcao} className={`inline-flex items-center gap-1 rounded-lg border border-border p-0.5 ${compacto ? "" : ""}`}>
      <span className="sr-only">{t("idioma.etiqueta")}</span>
      {botao("pt-PT", t("idioma.pt"), t("idioma.portugues"))}
      {botao("en", t("idioma.en"), t("idioma.ingles"))}
    </form>
  );
}
