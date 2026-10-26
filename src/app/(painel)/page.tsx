import Link from "next/link";
import { Suspense } from "react";
import { DATA_DEMONSTRACAO } from "@/lib/demonstracao";
import { um } from "@/lib/consulta-pagina";
import { formatarDataLongaLocale, formatarNumero } from "@/lib/i18n/formatacao";
import { COR_OPERADOR, eDataIso, hojeLisboa } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { LegendaOperadores } from "@/components/legenda-operadores";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { painel } from "@/server/servicos";

function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}

async function Painel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, idioma } = await i18nPedido();
  const parametros = await searchParams;
  const pedido = um(parametros.data);
  const data = eDataIso(pedido) ? pedido : DATA_DEMONSTRACAO;
  const ator = await exigirAtorPagina();
  const vista = painel(ator, data);
  const hoje = hojeLisboa();
  const cartoes = [
    [t("painel.agendadas"), vista.contagens.agendada],
    [t("painel.emCurso"), vista.contagens.emCurso],
    [t("painel.concluidas"), vista.contagens.concluida],
    [t("painel.emFila"), vista.contagens.emEspera],
    [t("painel.pendentes"), vista.contagens.pendente],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl">{t("painel.titulo", { data: formatarDataLongaLocale(data, idioma) })}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("painel.intro", { margem: vista.margemDeslocacaoMin })}</p>
          <p className="mt-2">
            <Link className="text-sm underline" href={`/agenda?vista=dia&data=${data}`}>
              {t("painel.abrirAgenda")}
            </Link>
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2" action="/">
          <label className="text-sm" htmlFor="data">
            {t("comum.dia")}
          </label>
          <input id="data" name="data" type="date" defaultValue={data} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" />
          <button className="h-9 rounded-lg bg-primary px-3 text-sm text-primary-foreground" type="submit">
            {t("comum.ver")}
          </button>
          <Link className="text-sm underline" href={`/?data=${hoje}`}>
            {t("comum.hoje")}
          </Link>
          <Link className="text-sm underline" href={`/?data=${DATA_DEMONSTRACAO}`}>
            {t("painel.demonstracao")}
          </Link>
        </form>
      </div>
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-heading text-xl">{t("painel.indicadores")}</h2>
          {ator.papel === "administrador" || ator.papel === "supervisor" ? (
            <Link href="/gemeo" className="text-sm underline">
              {t("painel.ligarGemeo")}
            </Link>
          ) : null}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("painel.indicadoresIntro")}</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              [
                t("painel.utilizacao"),
                `${Math.round(vista.indicadores.utilizacao * 100)}%`,
                t("painel.ocupadosDe", {
                  ocupados: formatarNumero(vista.indicadores.minutosOcupados, idioma),
                  capacidade: formatarNumero(vista.indicadores.minutosCapacidade, idioma),
                }),
              ],
              [t("painel.ocioso"), `${vista.indicadores.minutosOciosos} ${t("comum.minutos")}`, t("painel.turnoSemVisita")],
              [t("painel.recusadas"), String(vista.indicadores.recusadas), t("painel.filaDia")],
              [
                t("painel.evitadas"),
                String(vista.indicadores.sobreReservasEvitadas),
                vista.indicadores.sobreReservas
                  ? t("painel.sobreposicoes", { n: vista.indicadores.sobreReservas })
                  : t("painel.semSobreposicao"),
              ],
            ] as const
          ).map(([rotulo, valor, detalhe]) => (
            <li key={rotulo} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">{rotulo}</p>
              <p className="font-heading text-3xl">{valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
            </li>
          ))}
        </ul>
      </section>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cartoes.map(([rotulo, valor]) => (
          <li key={rotulo} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">{rotulo}</p>
            <p className="font-heading text-3xl">{valor}</p>
          </li>
        ))}
      </ul>
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-heading text-xl">{t("painel.ocupacao")}</h2>
          <LegendaOperadores compacta />
        </div>
        <p className="text-sm text-muted-foreground">{t("painel.ocupacaoIntro")}</p>
        {vista.equipas.length === 0 ? (
          <EstadoVazio titulo={t("painel.semEquipasTitulo")} detalhe={t("painel.semEquipasDetalhe")} />
        ) : null}
        <ul className="space-y-3">
          {vista.equipas.map((equipa) => (
            <li key={equipa.equipaId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/equipas/${equipa.equipaId}?data=${data}`} className="font-medium underline-offset-2 hover:underline">
                  {equipa.nome}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {equipa.ocupadoMin} / {equipa.turnoMin} {t("comum.minutos")} · {equipa.percentagem}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full bg-primary" style={{ width: `${Math.min(equipa.percentagem, 100)}%` }} />
              </div>
              {equipa.porOperador && equipa.porOperador.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                  {equipa.porOperador.map((parte) => (
                    <li key={parte.operadorId} className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full" style={{ backgroundColor: COR_OPERADOR[parte.operadorId] }} />
                      {t(`operador.${parte.operadorId}`)} {parte.minutos} {t("comum.minutos")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl">{t("painel.visitas")}</h2>
          {ator.papel === "tecnico" ? null : (
            <Link href="/ordens/nova" className="text-sm underline">
              {t("painel.novaOrdem")}
            </Link>
          )}
        </div>
        {vista.visitas.length === 0 ? (
          <EstadoVazio
            titulo={t("painel.semVisitasTitulo")}
            detalhe={t("painel.semVisitasDetalhe")}
            accao={
              <Link className="text-sm underline" href={`/agenda?vista=dia&data=${data}`}>
                {t("painel.verAgendaMesmo")}
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {vista.visitas.map((ordem) => (
              <li key={ordem.id}>
                <Link href={`/ordens/${ordem.id}`} className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-muted">
                  <span className="w-28 text-sm tabular-nums">
                    {ordem.inicioPlaneado ?? "—"}–{ordem.fimPlaneado ?? "—"}
                  </span>
                  <span className="font-medium">{ordem.referencia}</span>
                  <EtiquetaOperador id={ordem.operadorId} />
                  <EtiquetaEstado estado={ordem.estado} />
                  <span className="text-sm text-muted-foreground">
                    {ordem.clienteNome} · {ordem.equipaNome}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Conteudo searchParams={searchParams} />;
}
