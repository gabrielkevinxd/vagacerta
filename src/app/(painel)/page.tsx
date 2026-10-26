import Link from "next/link";
import { Suspense } from "react";
import { DATA_DEMONSTRACAO } from "@/lib/demonstracao";
import { um } from "@/lib/consulta-pagina";
import { formatarDataLongaLocale, formatarNumero } from "@/lib/i18n/formatacao";
import { COR_OPERADOR, eDataIso, hojeLisboa } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { GrelhaIndicadores, Indicador } from "@/components/layout/indicador";
import { ItemListaDados, ListaDados } from "@/components/layout/lista-dados";
import { Seccao } from "@/components/layout/superficie";
import { LegendaOperadores } from "@/components/legenda-operadores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { painel } from "@/server/servicos";

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
      <CabecalhoPagina
        titulo={t("painel.titulo", { data: formatarDataLongaLocale(data, idioma) })}
        descricao={t("painel.intro", { margem: vista.margemDeslocacaoMin })}
        accoes={
          <form className="flex flex-wrap items-center gap-2" action="/">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="data">
              {t("comum.dia")}
            </label>
            <Input id="data" name="data" type="date" defaultValue={data} className="h-8 w-auto" />
            <Button type="submit" size="sm">
              {t("comum.ver")}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/?data=${hoje}`}>{t("comum.hoje")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/?data=${DATA_DEMONSTRACAO}`}>{t("painel.demonstracao")}</Link>
            </Button>
          </form>
        }
      />

      <Seccao
        titulo={t("painel.indicadores")}
        descricao={t("painel.indicadoresIntro")}
        accoes={
          ator.papel === "administrador" || ator.papel === "supervisor" ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/gemeo">{t("painel.ligarGemeo")}</Link>
            </Button>
          ) : null
        }
      >
        <GrelhaIndicadores>
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
            <Indicador key={rotulo} rotulo={rotulo} valor={valor} detalhe={detalhe} />
          ))}
        </GrelhaIndicadores>
      </Seccao>

      <ul className="superficie grid overflow-hidden sm:grid-cols-5">
        {cartoes.map(([rotulo, valor], i) => (
          <li key={rotulo} className={`px-4 py-3 ${i > 0 ? "border-t border-border sm:border-t-0 sm:border-l" : ""}`}>
            <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{valor}</p>
          </li>
        ))}
      </ul>

      <Seccao titulo={t("painel.ocupacao")} descricao={t("painel.ocupacaoIntro")} accoes={<LegendaOperadores compacta />}>
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
                {vista.equipas.map((equipa) => (
                  <tr key={equipa.equipaId} className="h-9 border-b border-border last:border-0 hover:bg-muted">
                    <td className="px-3">
                      <Link href={`/equipas/${equipa.equipaId}?data=${data}`} className="font-medium hover:text-primary">
                        {equipa.nome}
                      </Link>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-sm bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(equipa.percentagem, 100)}%` }} />
                        </div>
                        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                          {equipa.ocupadoMin}/{equipa.turnoMin} {t("comum.minutos")}
                        </span>
                      </div>
                      {equipa.porOperador && equipa.porOperador.length > 0 ? (
                        <ul className="mt-1 flex flex-wrap gap-2 text-[11px]/4 text-muted-foreground">
                          {equipa.porOperador.map((parte) => (
                            <li key={parte.operadorId} className="inline-flex items-center gap-1">
                              <span className="size-1.5 rounded-full" style={{ backgroundColor: COR_OPERADOR[parte.operadorId] }} />
                              {t(`operador.${parte.operadorId}`)} {parte.minutos}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="px-3 text-right tabular-nums">{equipa.percentagem}%</td>
                  </tr>
                ))}
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
          <ListaDados>
            {vista.visitas.map((ordem) => (
              <ItemListaDados key={ordem.id} href={`/ordens/${ordem.id}`} className="h-9 py-0">
                <span className="w-28 font-mono text-xs tabular-nums text-muted-foreground">
                  {ordem.inicioPlaneado ?? "—"}–{ordem.fimPlaneado ?? "—"}
                </span>
                <span className="font-mono text-[13px]/5 font-medium">{ordem.referencia}</span>
                <EtiquetaOperador id={ordem.operadorId} soPonto />
                <EtiquetaEstado estado={ordem.estado} />
                <span className="text-muted-foreground">
                  {ordem.clienteNome} · {ordem.equipaNome}
                </span>
              </ItemListaDados>
            ))}
          </ListaDados>
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
