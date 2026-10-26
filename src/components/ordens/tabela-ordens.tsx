"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useT } from "@/components/idioma/provedor";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import type { Idioma } from "@/lib/i18n";
import type { EstadoOrdem, OperadorId } from "@/lib/rules";
import { cn } from "@/lib/utils";

export type LinhaOrdem = {
  id: string;
  referencia: string;
  clienteNome: string;
  morada: string;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  equipaNome: string | null;
  operadorId: OperadorId;
  estado: EstadoOrdem;
};

export function TabelaOrdens({
  ordens,
  idioma,
  ordemAberta,
}: {
  ordens: LinhaOrdem[];
  idioma: Idioma;
  ordemAberta?: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const todas = useMemo(() => new Set(ordens.map((o) => o.id)), [ordens]);
  const todasMarcadas = selecionadas.size > 0 && selecionadas.size === ordens.length;

  const alternar = (id: string, marcado: boolean) => {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (marcado) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  };

  const abrir = (id: string) => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    sp.set("ordem", id);
    router.push(`/ordens?${sp.toString()}`, { scroll: false });
  };

  return (
    <div className="relative">
      <div className="superficie overflow-hidden">
        <table className="w-full border-collapse text-[13px]/5">
          <thead className="sticky top-0 z-10 bg-muted/50">
            <tr className="h-9 border-b border-border text-left">
              <th className="w-10 px-3">
                <Checkbox
                  checked={todasMarcadas}
                  onCheckedChange={(v) => setSelecionadas(v ? new Set(todas) : new Set())}
                  aria-label={t("tabela.selecionadas", { n: ordens.length })}
                />
              </th>
              <th className="px-2 text-xs font-medium text-muted-foreground">{t("tabela.ref")}</th>
              <th className="px-2 text-xs font-medium text-muted-foreground">{t("tabela.cliente")}</th>
              <th className="px-2 text-xs font-medium text-muted-foreground">{t("tabela.janela")}</th>
              <th className="px-2 text-xs font-medium text-muted-foreground">{t("tabela.equipa")}</th>
              <th className="px-2 text-xs font-medium text-muted-foreground">{t("comum.operador")}</th>
              <th className="px-2 text-xs font-medium text-muted-foreground">{t("comum.estado")}</th>
            </tr>
          </thead>
          <tbody>
            {ordens.map((ordem) => {
              const activa = ordemAberta === ordem.id;
              return (
                <tr
                  key={ordem.id}
                  className={cn(
                    "h-9 border-b border-border transition-colors last:border-0 hover:bg-muted",
                    activa && "bg-accent",
                  )}
                >
                  <td className="px-3">
                    <Checkbox
                      checked={selecionadas.has(ordem.id)}
                      onCheckedChange={(v) => alternar(ordem.id, Boolean(v))}
                      aria-label={ordem.referencia}
                    />
                  </td>
                  <td className="px-2">
                    <button
                      type="button"
                      onClick={() => abrir(ordem.id)}
                      className="font-mono text-[13px]/5 font-medium tabular-nums text-foreground foco-anel"
                    >
                      {ordem.referencia}
                    </button>
                  </td>
                  <td className="max-w-[14rem] truncate px-2">
                    <button type="button" onClick={() => abrir(ordem.id)} className="truncate text-left foco-anel">
                      {ordem.clienteNome}
                      <span className="block truncate text-xs text-muted-foreground">{ordem.morada}</span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-2 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatarDataLocale(ordem.data, idioma)} · {ordem.janelaInicio}–{ordem.janelaFim}
                  </td>
                  <td className="truncate px-2 text-muted-foreground">{ordem.equipaNome ?? "—"}</td>
                  <td className="px-2">
                    <EtiquetaOperador id={ordem.operadorId} soPonto />
                  </td>
                  <td className="px-2">
                    <EtiquetaEstado estado={ordem.estado} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selecionadas.size > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-3 rounded-lg border border-border bg-popover px-3 py-2 shadow-[var(--shadow-popover)]">
          <span className="text-xs font-medium">{t("tabela.selecionadas", { n: selecionadas.size })}</span>
          <Button type="button" size="sm" variant="outline" disabled>
            {t("tabela.reagendar")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled>
            {t("tabela.cancelar")}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled>
            {t("tabela.exportar")}
          </Button>
        </div>
      ) : null}
      <p className="sr-only">
        <Link href="/ordens">{t("filtros.limpar")}</Link>
      </p>
    </div>
  );
}
