import Link from "next/link";
import { Suspense } from "react";
import { um } from "@/lib/consulta-pagina";
import { formatarDataLongaLocale, formatarNumero } from "@/lib/i18n/formatacao";
import { COR_OPERADOR, eDataIso, hojeLisboa } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { GrelhaIndicadores, Indicador } from "@/components/layout/indicador";
import { Seccao } from "@/components/layout/superficie";
import { LegendaOperadores } from "@/components/legenda-operadores";
import { SeletorData } from "@/components/seletor-data";
import { Button } from "@/components/ui/button";
import { i18nPedido } from "@/server/idioma";
import { diaDemonstracaoAtual } from "@/server/db";
import { exigirAtorPagina } from "@/server/sessao";
import { painel } from "@/server/servicos";

async function Painel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parametros = await searchParams;
  const ator = await exigirAtorPagina();
  const { t, idioma } = await i18nPedido();
  const pedido = um(parametros.data);
  const diaRico = diaDemonstracaoAtual();
  const data = eDataIso(pedido) ? pedido : diaRico;
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
      <CabecalhoPagina
        titulo={t("painel.titulo", { data: formatarDataLongaLocale(data, idioma) })}
        descricao={t("painel.intro", { margem: vista.margemDeslocacaoMin })}
        accoes={
          <form className="flex flex-wrap items-center gap-2" action="/">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="data">
              {t("comum.dia")}
            </label>
            <SeletorData id="data" name="data" defaultValue={data} className="w-auto" />
            <Button type="submit" variant="outline">
              {t("comum.ver")}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/?data=${hoje}`}>{t("comum.hoje")}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/?data=${diaRico}`}>{t("painel.demonstracao")}</Link>
            </Button>
          </form>
        }
      />

      <Seccao
        titulo={t("painel.indicadores")}
        accoes={
          ator.papel === "administrador" || ator.papel === "supervisor" ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/gemeo">{t("painel.ligarGemeo")}</Link>
            </Button>
          ) : null
        }
      >
        <GrelhaIndicadores className="grid-cols-2 lg:grid-cols-5">
          <Indicador
            rotulo={t("painel.utilizacao")}
            valor={`${Math.round(vista.indicadores.utilizacao * 100)}%`}
            detalhe={t("painel.ocupadosDe", {
              ocupados: formatarNumero(vista.indicadores.minutosOcupados, idioma),
              capacidade: formatarNumero(vista.indicadores.minutosCapacidade, idioma),
            })}
            className="p-3 [&_p:nth-child(2)]:text-xl"
          />
          <Indicador
            rotulo={t("painel.ocioso")}
            valor={`${formatarNumero(vista.indicadores.minutosOciosos, idioma)} ${t("comum.minutos")}`}
            detalhe={t("painel.turnoSemVisita")}
            className="p-3 [&_p:nth-child(2)]:text-xl"
          />
          <Indicador
            rotulo={t("painel.recusadas")}
            valor={formatarNumero(vista.indicadores.recusadas, idioma)}
            detalhe={t("painel.filaDia")}
            className="p-3 [&_p:nth-child(2)]:text-xl"
          />
          <Indicador
            rotulo={t("painel.agendadas")}
            valor={formatarNumero(vista.contagens.agendada, idioma)}
            className="p-3 [&_p:nth-child(2)]:text-xl"
          />
          <Indicador
            rotulo={t("painel.emFila")}
            valor={formatarNumero(vista.contagens.emEspera, idioma)}
            className="p-3 [&_p:nth-child(2)]:text-xl"
          />
        </GrelhaIndicadores>
        <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {cartoes
            .filter(([rotulo]) => rotulo !== t("painel.agendadas") && rotulo !== t("painel.emFila"))
            .map(([rotulo, valor]) => (
              <li key={rotulo} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
                <span>{rotulo}</span>
                <span className="font-medium tabular-nums text-foreground">{valor}</span>
              </li>
            ))}
        </ul>
      </Seccao>

      <Seccao
        titulo={t("painel.ocupacao")}
        descricao={t("painel.ocupacaoIntro")}
        accoes={
          <LegendaOperadores
            compacta
            apenas={ator.papel === "despachante" ? ator.operadorId : null}
            comOutros={ator.papel === "despachante"}
          />
        }
      >
        {vista.equipas.length === 0 ? (
          <EstadoVazio titulo={t("painel.semEquipasTitulo")} detalhe={t("painel.semEquipasDetalhe")} />
        ) : (
          <div className="superficie overflow-hidden">
            <table className="w-full text-[13px]/5">
              <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <tr className="h-9 border-b border-border">
                  <th className="px-3 font-medium">{t("tabela.equipa")}</th>
                  <th className="px-3 font-medium">{t("painel.ocupacao")}</th>
                  <th className="px-3 text-right font-medium tabular-nums">%</th>
                </tr>
              </thead>
              <tbody>
                {vista.equipas.map((equipa) => {
                  const temPartes = Boolean(equipa.porOperador?.length) || (equipa.minutosOutros ?? 0) > 0;
                  return (
                  <tr key={equipa.equipaId} className="h-9 border-b border-border last:border-0 hover:bg-muted">
                    <td className="px-3">
                      <Link href={`/equipas/${equipa.equipaId}?data=${data}`} className="font-medium hover:text-primary">
                        {equipa.nome}
                      </Link>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-sm bg-muted">
                          {temPartes ? (
                            <>
                              {(equipa.porOperador ?? []).map((parte) => (
                                <div
                                  key={parte.operadorId}
                                  className="h-full"
                                  style={{
                                    width: `${equipa.turnoMin ? Math.min((parte.minutos / equipa.turnoMin) * 100, 100) : 0}%`,
                                    backgroundColor: COR_OPERADOR[parte.operadorId],
                                  }}
                                />
                              ))}
                              {(equipa.minutosOutros ?? 0) > 0 ? (
                                <div
                                  className="h-full bg-muted-foreground/40"
                                  style={{
                                    width: `${equipa.turnoMin ? Math.min((equipa.minutosOutros / equipa.turnoMin) * 100, 100) : 0}%`,
                                  }}
                                />
                              ) : null}
                            </>
                          ) : (
                            <div
                              className="h-full bg-foreground/60"
                              style={{ width: `${Math.min(equipa.percentagem, 100)}%` }}
                            />
                          )}
                        </div>
                        <span className="w-28 whitespace-nowrap text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {equipa.ocupadoMin}/{equipa.turnoMin} {t("comum.minutos")}
                        </span>
                      </div>
                      {temPartes ? (
                        <ul className="mt-1 flex flex-wrap gap-2 text-[11px]/4 text-muted-foreground">
                          {(equipa.porOperador ?? []).map((parte) => (
                            <li key={parte.operadorId} className="inline-flex items-center gap-1">
                              <span className="size-1.5 rounded-full" style={{ backgroundColor: COR_OPERADOR[parte.operadorId] }} />
                              {t(`operador.${parte.operadorId}`)} {parte.minutos}
                            </li>
                          ))}
                          {(equipa.minutosOutros ?? 0) > 0 ? (
                            <li className="inline-flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                              {t("operador.outrosOcupado")} {equipa.minutosOutros}
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </td>
                    <td className="px-3 text-right tabular-nums">{equipa.percentagem}%</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Seccao>

      <Seccao
        titulo={t("painel.visitas")}
        accoes={
          ator.papel === "tecnico" ? null : (
            <Button asChild size="sm">
              <Link href="/ordens/nova">{t("painel.novaOrdem")}</Link>
            </Button>
          )
        }
      >
        {vista.visitas.length === 0 ? (
          <EstadoVazio
            titulo={t("painel.semVisitasTitulo")}
            detalhe={t("painel.semVisitasDetalhe")}
            accao={
              <Button asChild variant="outline" size="sm">
                <Link href={`/agenda?vista=dia&data=${data}`}>{t("painel.verAgendaMesmo")}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {vista.visitas.map((ordem) => (
                <li key={ordem.id}>
                  <Link href={`/ordens/${ordem.id}`} className="superficie block space-y-1 p-3 transition-colors hover:bg-muted/50 foco-anel">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {ordem.inicioPlaneado ?? "—"}–{ordem.fimPlaneado ?? "—"}
                      </span>
                      <EtiquetaEstado estado={ordem.estado} />
                    </div>
                    <p className="inline-flex items-center gap-1.5 font-mono text-[13px]/5 font-medium">
                      <EtiquetaOperador id={ordem.operadorId} soPonto />
                      {ordem.referencia}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ordem.clienteNome} · {ordem.equipaNome}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="superficie hidden overflow-x-auto md:block">
              <table className="w-full text-[13px]/5">
                <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <tr className="h-9 border-b border-border">
                    <th className="px-3 font-medium">{t("comum.hora")}</th>
                    <th className="px-3 font-medium">{t("tabela.ref")}</th>
                    <th className="px-3 font-medium">{t("tabela.cliente")}</th>
                    <th className="px-3 font-medium">{t("tabela.equipa")}</th>
                    <th className="px-3 font-medium">{t("comum.estado")}</th>
                  </tr>
                </thead>
                <tbody>
                  {vista.visitas.map((ordem) => (
                    <tr key={ordem.id} className="h-9 border-b border-border last:border-0 hover:bg-muted">
                      <td className="px-3 font-mono text-xs tabular-nums text-muted-foreground">
                        {ordem.inicioPlaneado ?? "—"}–{ordem.fimPlaneado ?? "—"}
                      </td>
                      <td className="px-3">
                        <Link href={`/ordens/${ordem.id}`} className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-medium hover:text-primary">
                          <EtiquetaOperador id={ordem.operadorId} soPonto />
                          {ordem.referencia}
                        </Link>
                      </td>
                      <td className="px-3 text-muted-foreground">{ordem.clienteNome}</td>
                      <td className="px-3 text-muted-foreground">{ordem.equipaNome}</td>
                      <td className="px-3">
                        <EtiquetaEstado estado={ordem.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Seccao>
    </div>
  );
}

export default function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}
