import Link from "next/link";
import { Suspense } from "react";
import { um } from "@/lib/consulta-pagina";
import { eCentral, eDataIso, podeGerirEquipas } from "@/lib/rules";
import { AcoesEquipa } from "@/components/acoes-equipa";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { DefinirMigalha } from "@/components/migalhas-contexto";
import { SeletorData } from "@/components/seletor-data";
import { Button } from "@/components/ui/button";
import type { Chave } from "@/lib/i18n";
import { formatarDataLocale, formatarDataLongaLocale } from "@/lib/i18n/formatacao";
import { i18nPedido } from "@/server/idioma";
import { diaDemonstracaoAtual } from "@/server/db";
import { exigirAtorPagina } from "@/server/sessao";
import { dicofreDaArea } from "@/lib/zonas/catalogo";
import { listarZonas, obterEquipa } from "@/server/servicos";

const DIAS: Chave[] = [
  "diaSemana.d1",
  "diaSemana.d1",
  "diaSemana.d2",
  "diaSemana.d3",
  "diaSemana.d4",
  "diaSemana.d5",
  "diaSemana.d6",
  "diaSemana.d7",
];

async function Conteudo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const consulta = await searchParams;
  const { t, idioma } = await i18nPedido();
  const pedida = um(consulta.data);
  const diaRico = diaDemonstracaoAtual();
  const data = eDataIso(pedida) ? pedida : diaRico;
  const ator = await exigirAtorPagina();
  const equipa = obterEquipa(ator, id, data);
  const zonas = listarZonas();
  const central = podeGerirEquipas(ator);

  return (
    <div className="space-y-8">
      <DefinirMigalha href={`/equipas/${equipa.id}`} rotulo={equipa.nome} />
      <div className="space-y-2">
        <Link href="/equipas" className="text-[13px]/5 text-muted-foreground underline">
          {t("nav.equipas")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{equipa.nome}</h1>
        <p className="text-[13px]/5 text-muted-foreground">
          {t("equipas.baseEm", {
            codigo: equipa.codigo,
            base: equipa.base,
            cco: equipa.cco,
            estado: equipa.ativa ? t("comum.ativa") : t("comum.inativa"),
          })}
        </p>
        <p className="max-w-2xl text-[13px]/5 text-muted-foreground">{t("equipas.competenciasIntro")}</p>
        <Link href={`/agenda?vista=dia&data=${data}`} className="inline-block text-[13px]/5 underline">
          {t("equipas.abrirDiaAgenda")}
        </Link>
      </div>
      <dl className="grid gap-3 superficie p-4 text-[13px]/5 md:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t("equipas.zonaVigor")}</dt>
          <dd>{equipa.zona ? `${equipa.zona.codigo} · ${equipa.zona.nome}` : t("equipas.semZona")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("equipas.areas")}</dt>
          <dd>{equipa.areas.join(", ")}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-muted-foreground">{t("equipas.operadoresServidos")}</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {equipa.operadoresServidos.map((id) => (
              <EtiquetaOperador key={id} id={id} nome={t(`operador.${id}`)} />
            ))}
          </dd>
          {!central ? (
            <p className="mt-1 text-[13px]/5 text-muted-foreground">{t("equipas.operadoresServidosSoLeitura")}</p>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <dt className="text-muted-foreground">{t("equipas.competencias")}</dt>
          <dd>
            <ul className="mt-1 space-y-1">
              {equipa.competencias.map((linha) => (
                <li key={linha.operadorId}>
                  {t(`operador.${linha.operadorId}`)}: {linha.categorias.map((item) => t(`categoria.${item}`)).join(", ")}
                  {linha.tecnologias.length > 0 ? ` · ${linha.tecnologias.map((item) => t(`tecnologia.${item}`)).join(", ")}` : ""}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-muted-foreground">{t("equipas.horario")}</dt>
          <dd>
            {equipa.horarios.map((linha) => (
              <span key={linha.diaSemana} className="mr-3 inline-block capitalize">
                {t(DIAS[linha.diaSemana] ?? "diaSemana.d1")} {linha.inicio}–{linha.fim}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">{t("equipas.diaDe", { data: formatarDataLongaLocale(data, idioma) })}</h2>
          <form action={`/equipas/${equipa.id}`} className="flex items-center gap-2">
            <label htmlFor="data" className="text-[13px]/5">
              {t("comum.data")}
            </label>
            <SeletorData id="data" name="data" defaultValue={data} className="w-auto" />
            <Button type="submit" variant="outline">
              {t("comum.ver")}
            </Button>
          </form>
        </div>
        <p className="text-[13px]/5">
          {t("equipas.turnoOcupacao", { turno: equipa.ocupacaoHoje.turnoMin, ocupado: equipa.ocupacaoHoje.ocupadoMin })}
          {eCentral(ator)
            ? ` ${t("equipas.reparticaoPainel")}`
            : ` ${t("equipas.minutosOutrosFicha", { n: equipa.ocupacaoHoje.minutosOutros })}`}
        </p>
        {equipa.ocupacaoHoje.proprias.length === 0 ? (
          <EstadoVazio titulo={t("equipas.semVisitasSuas")} detalhe={t("equipas.semVisitasSuasDetalhe")} />
        ) : (
          <ul className="divide-y divide-border superficie">
            {equipa.ocupacaoHoje.proprias.map((ordem) => (
              <li key={ordem.id}>
                <Link href={`/ordens/${ordem.id}`} className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-muted">
                  <span className="text-[13px]/5 tabular-nums">
                    {ordem.inicioPlaneado ?? ordem.janelaInicio}–{ordem.fimPlaneado ?? ordem.janelaFim}
                  </span>
                  <span className="font-medium">{ordem.referencia}</span>
                  <EtiquetaOperador id={ordem.operadorId} nome={ordem.operadorNome} />
                  <EtiquetaEstado estado={ordem.estado} />
                  <span className="text-[13px]/5 text-muted-foreground">
                    {ordem.clienteNome} · {ordem.morada}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {central ? (
        <AcoesEquipa
          equipaId={equipa.id}
          equipaNome={equipa.nome}
          ativa={equipa.ativa}
          zonas={zonas}
          zonaAtualId={equipa.zona?.id ?? null}
          zonaPredefinidaId={dicofreDaArea(equipa.base) ?? null}
          horarios={equipa.horarios}
          membros={equipa.membros}
          indisponibilidades={equipa.indisponibilidades}
          operadoresServidos={equipa.operadoresServidos}
        />
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{t("equipas.membros")}</h2>
            <ul className="text-[13px]/5">
              {equipa.membros.map((membro) => (
                <li key={membro.id}>
                  {membro.nome}
                  {membro.ativo ? "" : ` ${t("comum.inativo")}`}
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{t("equipas.indisponibilidades")}</h2>
            {equipa.indisponibilidades.length === 0 ? (
              <p className="text-[13px]/5 text-muted-foreground">{t("equipas.nenhumaIndisp")}</p>
            ) : (
              <ul className="text-[13px]/5">
                {equipa.indisponibilidades.map((bloco) => (
                  <li key={bloco.id}>
                    {formatarDataLocale(bloco.data, idioma)} {bloco.inicio}–{bloco.fim} · {bloco.motivo}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function Pagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Conteudo params={params} searchParams={searchParams} />
    </Suspense>
  );
}
