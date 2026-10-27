"use client";

import { useT } from "@/components/idioma/provedor";
import type { MetricasPolitica, RelatorioGemeo } from "@/lib/contratos/gemeo";
import { formatarDataLocale, formatarNumero, formatarPercentagem } from "@/lib/i18n/formatacao";
import type { Chave } from "@/lib/i18n";

const COR: Record<MetricasPolitica["id"], string> = {
  independente: "var(--chart-1)",
  partilhada: "var(--chart-2)",
  reencaixe: "var(--chart-3)",
};

const CHAVE_POL: Record<MetricasPolitica["id"], Chave> = {
  independente: "politicas.independente",
  partilhada: "politicas.partilhada",
  reencaixe: "politicas.reencaixe",
};

export function TabelaPoliticas({ politicas }: { politicas: MetricasPolitica[] }) {
  const { t, idioma } = useT();
  const linhas: [Chave, (p: MetricasPolitica) => string][] = [
    ["gemeo.aceites", (p) => formatarNumero(p.aceites, idioma)],
    ["gemeo.recusadas", (p) => formatarNumero(p.recusadas, idioma)],
    ["gemeo.sobreReservas", (p) => formatarNumero(p.sobreReservas, idioma)],
    ["gemeo.evitadas", (p) => formatarNumero(p.sobreReservasEvitadas, idioma)],
    ["gemeo.minOcupados", (p) => formatarNumero(p.minutosOcupados, idioma)],
    ["gemeo.minOciosos", (p) => formatarNumero(p.minutosOciosos, idioma)],
    ["gemeo.utilizacao", (p) => formatarPercentagem(p.utilizacao, idioma, 1)],
  ];
  return (
    <div className="overflow-x-auto superficie border">
      <table className="w-full min-w-[40rem] text-left text-[13px]/5">
        <caption className="sr-only">{t("gemeo.compararPoliticas")}</caption>
        <thead className="bg-muted/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t("gemeo.indicador")}</th>
            {politicas.map((politica) => (
              <th key={politica.id} className="px-3 py-2 text-right font-medium tabular-nums">
                {t(CHAVE_POL[politica.id])}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(([chave, valor]) => (
            <tr key={chave} className="border-t border-border">
              <th className="px-3 py-2 text-left font-medium">{t(chave)}</th>
              {politicas.map((politica) => (
                <td key={politica.id} className="px-3 py-2 text-right tabular-nums">
                  {valor(politica)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BarrasPolitica({
  politicas,
  campo,
  titulo,
  explicacao,
  percentagem: emPercentagem = false,
}: {
  politicas: MetricasPolitica[];
  campo: keyof MetricasPolitica;
  titulo: string;
  explicacao: string;
  percentagem?: boolean;
}) {
  const { t, idioma } = useT();
  const valores = politicas.map((politica) => Number(politica[campo]));
  const maximo = Math.max(...valores, emPercentagem ? 1 : 0.001);
  return (
    <figure className="space-y-3 superficie p-4">
      <figcaption>
        <p className="text-[13px]/5 font-semibold tracking-tight">{titulo}</p>
        <p className="mt-1 text-[13px]/5 text-muted-foreground">{explicacao}</p>
      </figcaption>
      <ul className="space-y-2">
        {politicas.map((politica, indice) => (
          <li key={politica.id} className="space-y-1">
            <div className="flex justify-between gap-2 text-[13px]/5">
              <span>{t(CHAVE_POL[politica.id])}</span>
              <span className="tabular-nums">
                {emPercentagem
                  ? formatarPercentagem(valores[indice]!, idioma, 1)
                  : formatarNumero(valores[indice]!, idioma)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, (valores[indice]! / maximo) * 100)}%`, backgroundColor: COR[politica.id] }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function SerieDiaria({ serie }: { serie: RelatorioGemeo["serieDiaria"] }) {
  const { t, idioma } = useT();
  const maximo = Math.max(...serie.map((ponto) => ponto.recusadas), 1);
  return (
    <figure className="space-y-3 superficie p-4">
      <figcaption>
        <p className="text-[13px]/5 font-semibold tracking-tight">{t("gemeo.serieTitulo")}</p>
        <p className="mt-1 text-[13px]/5 text-muted-foreground">{t("gemeo.serieExplicacao")}</p>
      </figcaption>
      <ul className="grid gap-2 sm:grid-cols-5">
        {serie.map((ponto) => (
          <li key={ponto.data} className="flex flex-col justify-end rounded-lg bg-muted/50 p-2">
            <div className="flex h-28 items-end">
              <div
                className="w-full rounded-t-md bg-[color:var(--chart-1)]"
                style={{ height: `${(ponto.recusadas / maximo) * 100}%`, minHeight: ponto.recusadas > 0 ? 4 : 0 }}
                title={t("gemeo.recusasBarra", { n: formatarNumero(ponto.recusadas, idioma) })}
              />
            </div>
            <p className="mt-2 text-xs font-medium">{formatarDataLocale(ponto.data, idioma)}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatarNumero(ponto.recusadas, idioma)} · {formatarPercentagem(ponto.utilizacao, idioma, 1)}
            </p>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function ComparacaoPesos({ relatorio }: { relatorio: RelatorioGemeo }) {
  const { t, idioma } = useT();
  if (!relatorio.comparacao?.length) return null;
  return (
    <figure className="space-y-3 superficie p-4">
      <figcaption>
        <p className="text-[13px]/5 font-semibold tracking-tight">{t("gemeo.pesos")}</p>
        <p className="mt-1 text-[13px]/5 text-muted-foreground">{t("gemeo.pesosExplicacao")}</p>
      </figcaption>
      <ul className="grid gap-3 sm:grid-cols-3">
        {relatorio.comparacao.map((linha) => (
          <li key={linha.operadorId} className="rounded-lg border border-border px-3 py-2 text-[13px]/5">
            <p className="font-medium">{t(`operador.${linha.operadorId}`)}</p>
            <p className="text-right tabular-nums text-muted-foreground">
              {t("gemeo.indepCurto")}: {formatarNumero(linha.aceitesIndependentes, idioma)}
            </p>
            <p className="text-right tabular-nums text-muted-foreground">
              {t("gemeo.partilhaCurto")}: {formatarNumero(linha.aceitesPartilhadas, idioma)}
            </p>
          </li>
        ))}
      </ul>
    </figure>
  );
}
