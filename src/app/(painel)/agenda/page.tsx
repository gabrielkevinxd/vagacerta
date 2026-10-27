import Link from "next/link";
import { Suspense } from "react";
import { um } from "@/lib/consulta-pagina";
import { fundirAgenda } from "@/lib/agenda-vista";
import type { Agenda, BlocoVista, LinhaVista } from "@/lib/rules/agenda";
import { distritosComCobertura, municipiosDoDistrito, nomesAreasCobertura } from "@/lib/zonas/catalogo";
import { GanttAgenda } from "@/components/agenda/gantt-agenda";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { Alerta } from "@/components/layout/alerta";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { SegmentoLigacao, Segmentos } from "@/components/layout/segmentos";
import { formatarDataLocale, formatarDataLongaLocale } from "@/lib/i18n/formatacao";
import { traduzirMensagem, traduzirNarrativa } from "@/lib/i18n/motor";
import { eCentral, eDataIso, hojeLisboa, semanaIso, somarDias } from "@/lib/rules";
import { ErroHttp } from "@/server/erros";
import { diaDemonstracaoAtual } from "@/server/db";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarEquipas, obterAgenda, preverReagendamento } from "@/server/servicos";
import { confirmarArrasto } from "./accoes";

const campo = "h-8 rounded-md border border-input bg-card px-2.5 text-[13px]/5";

function encontrar(agenda: Agenda, id: string): { bloco: BlocoVista; equipa: LinhaVista; data: string } | null {
  for (const dia of agenda.dias) {
    for (const equipa of dia.equipas) {
      const bloco = equipa.blocos.find((item) => item.id === id);
      if (bloco) return { bloco, equipa, data: dia.data };
    }
  }
  return null;
}

function ligacao(href: string, rotulo: string) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-[13px]/5 font-medium transition-colors hover:bg-muted"
    >
      {rotulo}
    </Link>
  );
}

function filtrarAgenda(agenda: Agenda, ids: Set<string> | null): Agenda {
  if (!ids) return agenda;
  return {
    ...agenda,
    dias: agenda.dias.map((dia) => ({
      ...dia,
      equipas: dia.equipas.filter((equipa) => ids.has(equipa.equipaId)),
    })),
  };
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, idioma, m } = await i18nPedido();
  const ator = await exigirAtorPagina();
  const consulta = await searchParams;
  const pedida = um(consulta.data);
  const diaRico = diaDemonstracaoAtual();
  const data = eDataIso(pedida) ? pedida : diaRico;
  const vista = um(consulta.vista) === "semana" ? "semana" : "dia";
  const distrito = um(consulta.distrito) ?? "";
  const municipio = um(consulta.municipio) ?? "";
  const distritos = distritosComCobertura();
  const municipios = distrito ? municipiosDoDistrito(distrito).map((item) => item.nome) : nomesAreasCobertura();
  const intervalo = vista === "semana" ? semanaIso(data) : { inicio: data, fim: data };
  const agendaBruta = obterAgenda(ator, intervalo.inicio, intervalo.fim);
  const filtroActivo = Boolean(distrito || municipio);
  const idsFiltro = filtroActivo
    ? new Set(
        listarEquipas(ator)
          .filter((equipa) => {
            if (distrito && equipa.distrito !== distrito) return false;
            if (municipio) {
              const cobre = equipa.base === municipio || equipa.areas.includes(municipio) || equipa.zona?.nome === municipio;
              if (!cobre) return false;
            }
            return true;
          })
          .map((equipa) => equipa.id),
      )
    : null;
  const agenda = filtrarAgenda(agendaBruta, idsFiltro);
  const perfil = ator.papel === "tecnico" ? "tecnico" : eCentral(ator) ? "central" : "despachante";
  const hoje = hojeLisboa();
  const anterior = somarDias(data, vista === "semana" ? -7 : -1);
  const seguinte = somarDias(data, vista === "semana" ? 7 : 1);
  const vazio = agenda.dias.every((dia) => dia.equipas.length === 0);
  const titulo =
    vista === "semana"
      ? t("agenda.semanaDe", { data: formatarDataLongaLocale(intervalo.inicio, idioma) })
      : formatarDataLongaLocale(data, idioma);
  const ordemPedida = um(consulta.ordem);
  const escolhida = ordemPedida ? encontrar(agenda, ordemPedida) : null;
  let previsao: ReturnType<typeof preverReagendamento> | null = null;
  let erroPrevisao = um(consulta.erro);
  if (um(consulta.prever) === "1" && ordemPedida && um(consulta.equipaId) && um(consulta.dia) && um(consulta.inicio)) {
    try {
      previsao = preverReagendamento(ator, ordemPedida, {
        equipaId: um(consulta.equipaId),
        data: um(consulta.dia),
        inicioPlaneado: um(consulta.inicio),
      });
    } catch (erro) {
      erroPrevisao = erro instanceof ErroHttp ? traduzirMensagem(m, erro.message, erro.codigo) : t("comum.pedidoFalhou");
    }
  }
  const agendaDesenhada = previsao ? fundirAgenda(agenda, previsao.depois) : agenda;
  const gravado = um(consulta.gravado) === "1";
  const zonaQuery = [distrito ? `distrito=${encodeURIComponent(distrito)}` : "", municipio ? `municipio=${encodeURIComponent(municipio)}` : ""]
    .filter(Boolean)
    .join("&");
  const comZona = (href: string) => (zonaQuery ? `${href}&${zonaQuery}` : href);
  const base = comZona(`/agenda?vista=${vista}&data=${data}`);
  const linhasVisiveis = agenda.dias[0]?.equipas.length ?? 0;

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo={t("agenda.titulo")}
        descricao={
          <>
            <p className="font-medium text-foreground/80">{titulo}</p>
            <p className="mt-1">
              {perfil === "tecnico" ? t("agenda.introTecnico") : perfil === "despachante" ? t("agenda.introDespacho") : t("agenda.introCentral")}
            </p>
          </>
        }
        accoes={
          <div className="flex flex-wrap items-center gap-2">
            <Segmentos etiqueta={t("agenda.titulo")}>
              <SegmentoLigacao href={comZona(`/agenda?vista=dia&data=${data}`)} ativo={vista === "dia"}>
                {t("comum.dia")}
              </SegmentoLigacao>
              <SegmentoLigacao href={comZona(`/agenda?vista=semana&data=${data}`)} ativo={vista === "semana"}>
                {t("comum.semana")}
              </SegmentoLigacao>
            </Segmentos>
            {ligacao(
              comZona(`/agenda?vista=${vista}&data=${anterior}`),
              vista === "semana" ? t("agenda.semanaAnterior") : t("agenda.diaAnterior"),
            )}
            {ligacao(
              comZona(`/agenda?vista=${vista}&data=${seguinte}`),
              vista === "semana" ? t("agenda.semanaSeguinte") : t("agenda.diaSeguinte"),
            )}
            {ligacao(comZona(`/agenda?vista=${vista}&data=${hoje}`), t("comum.hoje"))}
            {ligacao(comZona(`/agenda?vista=${vista}&data=${diaRico}`), t("agenda.demonstracao"))}
          </div>
        }
      />
      <form className="flex flex-wrap items-end gap-3" action="/agenda" method="get">
        <input type="hidden" name="vista" value={vista} />
        <input type="hidden" name="data" value={data} />
        <div className="space-y-1.5">
          <label htmlFor="distrito" className="text-[13px]/5 text-muted-foreground">
            {t("agenda.filtrarDistrito")}
          </label>
          <select id="distrito" name="distrito" defaultValue={distrito} className={campo}>
            <option value="">{t("agenda.filtrarTodos")}</option>
            {distritos.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="municipio" className="text-[13px]/5 text-muted-foreground">
            {t("agenda.filtrarMunicipio")}
          </label>
          <select id="municipio" name="municipio" defaultValue={municipio} className={campo}>
            <option value="">{t("agenda.filtrarTodos")}</option>
            {municipios.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-[13px]/5 font-medium hover:bg-muted">
          {t("agenda.filtrarAplicar")}
        </button>
      </form>
      {filtroActivo && !vazio ? (
        <p className="text-[13px]/5 text-muted-foreground">{t("agenda.filtroActivo", { n: linhasVisiveis })}</p>
      ) : null}
      {gravado ? <Alerta tom="sucesso">{t("agenda.gravado")}</Alerta> : null}
      {erroPrevisao ? (
        <Alerta tom="erro" role="alert" className="sticky top-2 z-30">
          {erroPrevisao} {t("agenda.voltou")}
        </Alerta>
      ) : null}
      {previsao && escolhida ? (
        <div id="mover" className="sticky top-2 z-30 space-y-3 superficie border-primary/40 p-4">
          <p className="text-[13px]/5 font-medium">{t("agenda.previsualizacao")}</p>
          <p className="text-[13px]/5">
            {t("agenda.antes", {
              equipa: escolhida.equipa.nome,
              data: formatarDataLocale(escolhida.data, idioma),
              inicio: escolhida.bloco.inicio,
              fim: escolhida.bloco.fim,
            })}
          </p>
          <p className="text-[13px]/5">{traduzirNarrativa(m, previsao.mensagem)}</p>
          <div className="flex flex-wrap gap-2">
            <form action={confirmarArrasto}>
              <input type="hidden" name="ordem" value={ordemPedida} />
              <input type="hidden" name="equipaId" value={um(consulta.equipaId)} />
              <input type="hidden" name="dia" value={um(consulta.dia)} />
              <input type="hidden" name="inicio" value={um(consulta.inicio)} />
              <input type="hidden" name="vista" value={vista} />
              <input type="hidden" name="data" value={data} />
              {distrito ? <input type="hidden" name="distrito" value={distrito} /> : null}
              {municipio ? <input type="hidden" name="municipio" value={municipio} /> : null}
              <button type="submit" className="inline-flex h-8 items-center rounded-lg bg-primary px-4 text-[13px]/5 font-medium text-primary-foreground">
                {t("agenda.guardarLugar")}
              </button>
            </form>
            <Link href={base} className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-4 text-[13px]/5">
              {t("comum.voltar")}
            </Link>
          </div>
        </div>
      ) : null}
      {escolhida && !previsao && perfil !== "tecnico" && escolhida.bloco.arrastavel ? (
        <form id="mover" action="/agenda" className="grid gap-3 superficie p-4 md:grid-cols-[1fr_1fr_8rem_auto] md:items-end">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="data" value={data} />
          {distrito ? <input type="hidden" name="distrito" value={distrito} /> : null}
          {municipio ? <input type="hidden" name="municipio" value={municipio} /> : null}
          <input type="hidden" name="ordem" value={escolhida.bloco.id} />
          <input type="hidden" name="prever" value="1" />
          <label className="space-y-1 text-[13px]/5">
            <span className="font-medium">{t("comum.equipa")}</span>
            <select name="equipaId" defaultValue={escolhida.equipa.equipaId} className="h-8 w-full rounded-lg border border-input bg-background px-2">
              {agenda.dias
                .flatMap((dia) => dia.equipas)
                .filter((equipa, indice, lista) => lista.findIndex((item) => item.equipaId === equipa.equipaId) === indice)
                .map((equipa) => (
                  <option key={equipa.equipaId} value={equipa.equipaId}>
                    {equipa.nome}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-1 text-[13px]/5">
            <span className="font-medium">{t("comum.dia")}</span>
            <select name="dia" defaultValue={escolhida.data} className="h-8 w-full rounded-lg border border-input bg-background px-2">
              {agenda.dias.map((dia) => (
                <option key={dia.data} value={dia.data}>
                  {formatarDataLongaLocale(dia.data, idioma)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[13px]/5">
            <span className="font-medium">{t("comum.inicio")}</span>
            <input name="inicio" type="time" step={300} required defaultValue={escolhida.bloco.inicio} className="h-8 w-full rounded-lg border border-input bg-background px-2" />
          </label>
          <button type="submit" className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-[13px]/5 font-medium text-primary-foreground">
            {t("comum.previsualizar")}
          </button>
        </form>
      ) : null}
      {vazio ? (
        <EstadoVazio
          titulo={filtroActivo ? t("agenda.semFiltroResultados") : t("agenda.semEquipasTitulo")}
          detalhe={filtroActivo ? t("agenda.semFiltroResultados") : t("agenda.semEquipasDetalhe")}
        />
      ) : (
        <GanttAgenda
          key={`${vista}-${agenda.de}-${agenda.ate}-${distrito}-${municipio}-${previsao ? "prever" : "base"}`}
          agendaInicial={agendaDesenhada}
          perfil={perfil}
          vista={vista}
          ancora={data}
          operadorLegenda={perfil === "despachante" ? ator.operadorId : null}
        />
      )}
    </div>
  );
}

export default function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}
