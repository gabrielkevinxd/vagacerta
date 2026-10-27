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
      className={`min-h-7 min-w-8 rounded px-2 text-xs font-semibold transition-colors ${
        idioma === valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {rotulo}
    </button>
  );
  return (
    <form
      action={definirIdiomaAcao}
      className={`inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 ${compacto ? "" : ""}`}
    >
      <span className="sr-only">{t("idioma.etiqueta")}</span>
      {botao("pt-PT", t("idioma.pt"), t("idioma.portugues"))}
      {botao("en", t("idioma.en"), t("idioma.ingles"))}
    </form>
  );
}
