import Link from "next/link";
import { Suspense } from "react";
import { um } from "@/lib/consulta-pagina";
import { fundirAgenda } from "@/lib/agenda-vista";
import type { Agenda, BlocoVista, LinhaVista } from "@/lib/rules/agenda";
import { GanttAgenda } from "@/components/agenda/gantt-agenda";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { formatarDataLocale, formatarDataLongaLocale } from "@/lib/i18n/formatacao";
import { traduzirHistoria, traduzirMensagem, traduzirNarrativa } from "@/lib/i18n/motor";
import { eCentral, eDataIso, hojeLisboa, semanaIso, somarDias } from "@/lib/rules";
import { diaDemonstracaoAtual } from "@/server/db";
import { ErroHttp } from "@/server/erros";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { obterAgenda, preverReagendamento } from "@/server/servicos";
import { confirmarArrasto } from "./accoes";

function encontrar(agenda: Agenda, id: string): { bloco: BlocoVista; equipa: LinhaVista; data: string } | null {
  for (const dia of agenda.dias) {
    for (const equipa of dia.equipas) {
      const bloco = equipa.blocos.find((item) => item.id === id);
      if (bloco) return { bloco, equipa, data: dia.data };
    }
  }
  return null;
}

function ligacao(href: string, rotulo: string, atual = false) {
  return (
    <Link
      href={href}
      aria-current={atual ? "page" : undefined}
      className={`inline-flex h-10 items-center rounded-lg px-3 text-sm ${atual ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
    >
      {rotulo}
    </Link>
  );
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, idioma, m } = await i18nPedido();
  const ator = await exigirAtorPagina();
  const consulta = await searchParams;
  const pedida = um(consulta.data);
  const diaRico = diaDemonstracaoAtual();
  const data = eDataIso(pedida) ? pedida : diaRico;
  const vista = um(consulta.vista) === "semana" ? "semana" : "dia";
  const intervalo = vista === "semana" ? semanaIso(data) : { inicio: data, fim: data };
  const agenda = obterAgenda(ator, intervalo.inicio, intervalo.fim);
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
  // O erro de uma gravação falhada chega pelo URL (ação do servidor) com o texto do motor: traduz-se aqui.
  erroPrevisao = erroPrevisao ? traduzirNarrativa(m, erroPrevisao) : erroPrevisao;
  const fundida = previsao ? fundirAgenda(agenda, previsao.depois) : agenda;
  // Os motivos das indisponibilidades (tooltip do Gantt) estão escritos em PT na base.
  const agendaDesenhada: Agenda = {
    ...fundida,
    dias: fundida.dias.map((dia) => ({
      ...dia,
      equipas: dia.equipas.map((linha) => ({
        ...linha,
        indisponibilidades: linha.indisponibilidades.map((bloco) => ({ ...bloco, motivo: traduzirHistoria(m, bloco.motivo) })),
      })),
    })),
  };
  const gravado = um(consulta.gravado) === "1";
  const base = `/agenda?vista=${vista}&data=${data}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl">{t("agenda.titulo")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{titulo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ligacao(`/agenda?vista=dia&data=${data}`, t("comum.dia"), vista === "dia")}
          {ligacao(`/agenda?vista=semana&data=${data}`, t("comum.semana"), vista === "semana")}
          {ligacao(
            `/agenda?vista=${vista}&data=${anterior}`,
            vista === "semana" ? t("agenda.semanaAnterior") : t("agenda.diaAnterior"),
          )}
          {ligacao(
            `/agenda?vista=${vista}&data=${seguinte}`,
            vista === "semana" ? t("agenda.semanaSeguinte") : t("agenda.diaSeguinte"),
          )}
          {ligacao(`/agenda?vista=${vista}&data=${hoje}`, t("comum.hoje"))}
          {ligacao(`/agenda?vista=${vista}&data=${diaRico}`, t("agenda.demonstracao"))}
        </div>
      </div>
      <p className="max-w-4xl text-sm text-muted-foreground">
        {perfil === "tecnico" ? t("agenda.introTecnico") : perfil === "despachante" ? t("agenda.introDespacho") : t("agenda.introCentral")}
      </p>
      {gravado ? (
        <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          {t("agenda.gravado")}
        </p>
      ) : null}
      {erroPrevisao ? (
        <p role="alert" className="sticky top-2 z-30 rounded-lg border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive">
          {erroPrevisao} {t("agenda.voltou")}
        </p>
      ) : null}
      {previsao && escolhida ? (
        <div id="mover" className="sticky top-2 z-30 space-y-3 rounded-xl border border-primary/40 bg-card p-4">
          <p className="text-sm font-medium">{t("agenda.previsualizacao")}</p>
          <p className="text-sm">
            {t("agenda.antes", {
              equipa: escolhida.equipa.nome,
              data: formatarDataLocale(escolhida.data, idioma),
              inicio: escolhida.bloco.inicio,
              fim: escolhida.bloco.fim,
            })}
          </p>
          <p className="text-sm">{traduzirNarrativa(m, previsao.mensagem)}</p>
          <div className="flex flex-wrap gap-2">
            <form action={confirmarArrasto}>
              <input type="hidden" name="ordem" value={ordemPedida} />
              <input type="hidden" name="equipaId" value={um(consulta.equipaId)} />
              <input type="hidden" name="dia" value={um(consulta.dia)} />
              <input type="hidden" name="inicio" value={um(consulta.inicio)} />
              <input type="hidden" name="vista" value={vista} />
              <input type="hidden" name="data" value={data} />
              <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                {t("agenda.guardarLugar")}
              </button>
            </form>
            <Link href={base} className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm">
              {t("comum.voltar")}
            </Link>
          </div>
        </div>
      ) : null}
      {escolhida && !previsao && perfil !== "tecnico" && escolhida.bloco.arrastavel ? (
        <form id="mover" action="/agenda" className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_8rem_auto] md:items-end">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="data" value={data} />
          <input type="hidden" name="ordem" value={escolhida.bloco.id} />
          <input type="hidden" name="prever" value="1" />
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("comum.equipa")}</span>
            <select name="equipaId" defaultValue={escolhida.equipa.equipaId} className="h-10 w-full rounded-lg border border-input bg-background px-2">
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
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("comum.dia")}</span>
            <select name="dia" defaultValue={escolhida.data} className="h-10 w-full rounded-lg border border-input bg-background px-2">
              {agenda.dias.map((dia) => (
                <option key={dia.data} value={dia.data}>
                  {formatarDataLongaLocale(dia.data, idioma)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("comum.inicio")}</span>
            <input name="inicio" type="time" step={300} required defaultValue={escolhida.bloco.inicio} className="h-10 w-full rounded-lg border border-input bg-background px-2" />
          </label>
          <button type="submit" className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {t("comum.previsualizar")}
          </button>
        </form>
      ) : null}
      {vazio ? (
        <EstadoVazio
          titulo={t("agenda.semEquipasTitulo")}
          detalhe={t("agenda.semEquipasDetalhe")}
        />
      ) : (
        <GanttAgenda
          key={`${vista}-${agenda.de}-${agenda.ate}-${previsao ? "prever" : "base"}`}
          agendaInicial={agendaDesenhada}
          perfil={perfil}
          vista={vista}
          ancora={data}
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
