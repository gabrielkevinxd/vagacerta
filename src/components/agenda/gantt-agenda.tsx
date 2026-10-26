"use client";

import Link from "next/link";
import { createContext, useContext, useRef, useState } from "react";
import {
  eixoDasLinhas,
  faixasDosBlocos,
  fundirAgenda,
  minutoNoEixo,
  moverBloco,
  percentagem,
  type Eixo,
} from "@/lib/agenda-vista";
import type { Agenda, BlocoVista, LinhaVista } from "@/lib/rules/agenda";
import { COR_OPERADOR } from "@/lib/rules/rotulos";
import { formatHHMM } from "@/lib/rules/tempo";
import { enviar } from "@/lib/cliente";
import { LegendaOperadores } from "@/components/legenda-operadores";
import { useT } from "@/components/idioma/provedor";
import { formatarDataLocale, formatarDataLongaLocale } from "@/lib/i18n/formatacao";
import { traduzirConflito, traduzirNarrativa } from "@/lib/i18n/motor";

type Perfil = "central" | "despachante" | "tecnico";
type ModoArrasto = "tempo" | "celula";
type Previsao = { mensagem: string; depois: Agenda };

type Proposta = {
  ordemId: string;
  equipaId: string;
  data: string;
  inicioPlaneado: string;
  mensagem: string;
  snapshot: Agenda;
};

type Fantasma = {
  ordemId: string;
  equipaId: string;
  data: string;
  inicioMin: number;
  duracaoMin: number;
  rotulo: string;
  modo: ModoArrasto;
  x: number;
  y: number;
  destinoValido: boolean;
};

const primario =
  "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50";
const secundario =
  "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium disabled:opacity-50";

const LigacaoAgenda = createContext({ vista: "dia" as "dia" | "semana", ancora: "" });

function minutosDe(valor: string): number {
  const [hora, minuto] = valor.split(":").map(Number);
  return hora * 60 + minuto;
}

function rotuloCurto(data: string, idioma: "pt-PT" | "en"): string {
  return formatarDataLongaLocale(data, idioma);
}

function horasDoEixo(eixo: Eixo): number[] {
  const horas: number[] = [];
  for (let minuto = eixo.inicioMin; minuto <= eixo.fimMin; minuto += 60) horas.push(minuto);
  return horas;
}

function localizar(agenda: Agenda, id: string): { bloco: BlocoVista; equipa: LinhaVista; data: string } | null {
  for (const dia of agenda.dias) {
    for (const equipa of dia.equipas) {
      const bloco = equipa.blocos.find((item) => item.id === id);
      if (bloco) return { bloco, equipa, data: dia.data };
    }
  }
  return null;
}

function nomeDaEquipa(agenda: Agenda, id: string): string {
  for (const dia of agenda.dias) {
    const equipa = dia.equipas.find((item) => item.equipaId === id);
    if (equipa) return equipa.nome;
  }
  return "equipa";
}

function faixaEm(x: number, y: number): HTMLElement | null {
  for (const elemento of document.elementsFromPoint(x, y)) {
    const faixa = (elemento as HTMLElement).closest?.("[data-faixa]");
    if (faixa instanceof HTMLElement) return faixa;
  }
  return null;
}

export function GanttAgenda({
  agendaInicial,
  perfil,
  vista,
  ancora,
}: {
  agendaInicial: Agenda;
  perfil: Perfil;
  vista: "dia" | "semana";
  ancora: string;
}) {
  const [agenda, setAgenda] = useState(agendaInicial);
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [fantasma, setFantasma] = useState<Fantasma | null>(null);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aCalcular, setACalcular] = useState(false);
  const { t, idioma, m } = useT();
  const fantasmaRef = useRef<Fantasma | null>(null);
  const trinco = useRef(false);
  const arrastou = useRef(false);

  function definirFantasma(valor: Fantasma | null) {
    fantasmaRef.current = valor;
    setFantasma(valor);
  }

  async function pedir(ordemId: string, equipaId: string, data: string, inicioPlaneado: string) {
    if (proposta || trinco.current) return;
    const snapshot = agenda;
    trinco.current = true;
    setACalcular(true);
    setErro(null);
    setAviso(null);
    setAgenda(moverBloco(snapshot, ordemId, { equipaId, data, inicioMin: minutosDe(inicioPlaneado) }));
    try {
      const resposta = await enviar<Previsao>(`/api/ordens/${ordemId}/reagendar/prever`, {
        equipaId,
        data,
        inicioPlaneado,
      });
      setAgenda(fundirAgenda(snapshot, resposta.depois));
      setProposta({ ordemId, equipaId, data, inicioPlaneado, mensagem: resposta.mensagem, snapshot });
      setEscolhidaId(ordemId);
    } catch (falha) {
      setAgenda(snapshot);
      setErro(falha instanceof Error ? `${falha.message} ${t("agenda.voltou")}` : t("agenda.voltou"));
    } finally {
      trinco.current = false;
      setACalcular(false);
    }
  }

  async function confirmar() {
    if (!proposta || trinco.current) return;
    trinco.current = true;
    setACalcular(true);
    setErro(null);
    try {
      await enviar(`/api/ordens/${proposta.ordemId}/reagendar`, {
        equipaId: proposta.equipaId,
        data: proposta.data,
        inicioPlaneado: proposta.inicioPlaneado,
      });
      const fresca = await enviar<Agenda>(`/api/agenda?de=${agenda.de}&ate=${agenda.ate}`, undefined, "GET");
      setAgenda(fresca);
      setProposta(null);
      setAviso(t("agenda.gravado"));
    } catch (falha) {
      setAgenda(proposta.snapshot);
      setProposta(null);
      setErro(falha instanceof Error ? `${falha.message} ${t("agenda.voltou")}` : t("agenda.falhouGravar"));
    } finally {
      trinco.current = false;
      setACalcular(false);
    }
  }

  function desfazer() {
    if (!proposta) return;
    setAgenda(proposta.snapshot);
    setProposta(null);
    setAviso(t("agenda.descartada"));
  }

  function iniciarArrasto(
    evento: React.PointerEvent<HTMLElement>,
    bloco: BlocoVista,
    data: string,
    equipaId: string,
    modo: ModoArrasto,
  ) {
    if (!bloco.arrastavel || proposta || trinco.current) return;
    if ((evento.target as HTMLElement).closest("button, input, select, textarea, summary, a")) return;
    evento.preventDefault();
    evento.stopPropagation();
    const alvo = evento.currentTarget;
    alvo.setPointerCapture(evento.pointerId);
    const origemX = evento.clientX;
    const origemY = evento.clientY;
    let moveu = false;
    let terminou = false;
    arrastou.current = false;
    setArrastandoId(bloco.id);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const lerDestino = (ev: PointerEvent): Fantasma => {
      const faixa = faixaEm(ev.clientX, ev.clientY);
      const modoFaixa = (faixa?.dataset.modo as ModoArrasto | undefined) ?? modo;
      let inicioMin = bloco.inicioMin;
      if (faixa && modoFaixa === "tempo") {
        const rect = faixa.getBoundingClientRect();
        const eixo = { inicioMin: Number(faixa.dataset.inicio), fimMin: Number(faixa.dataset.fim) };
        inicioMin = minutoNoEixo((ev.clientX - rect.left) / Math.max(rect.width, 1), eixo);
      }
      return {
        ordemId: bloco.id,
        equipaId: faixa?.dataset.equipa ?? equipaId,
        data: faixa?.dataset.dia ?? data,
        inicioMin,
        duracaoMin: bloco.duracaoMin,
        rotulo: bloco.referencia ?? t("agenda.visita"),
        modo: modoFaixa,
        x: ev.clientX,
        y: ev.clientY,
        destinoValido: Boolean(faixa && faixa.dataset.turno === "1"),
      };
    };

    const mover = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - origemX, ev.clientY - origemY) > 5) {
        moveu = true;
        arrastou.current = true;
      }
      if (!moveu) return;
      definirFantasma(lerDestino(ev));
    };

    const largar = (ev: PointerEvent) => {
      if (terminou) return;
      terminou = true;
      alvo.removeEventListener("pointermove", mover);
      alvo.removeEventListener("pointerup", largar);
      alvo.removeEventListener("pointercancel", largar);
      if (alvo.hasPointerCapture(evento.pointerId)) alvo.releasePointerCapture(evento.pointerId);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      const destino = moveu ? lerDestino(ev) : null;
      definirFantasma(null);
      setArrastandoId(null);
      if (!moveu || !destino) {
        setEscolhidaId(bloco.id);
        return;
      }
      if (!destino.destinoValido) {
        arrastou.current = false;
        setErro(t("agenda.largueTurno"));
        return;
      }
      if (destino.equipaId === equipaId && destino.data === data && destino.inicioMin === bloco.inicioMin) {
        arrastou.current = false;
        setEscolhidaId(bloco.id);
        return;
      }
      void pedir(bloco.id, destino.equipaId, destino.data, formatHHMM(destino.inicioMin));
    };

    alvo.addEventListener("pointermove", mover);
    alvo.addEventListener("pointerup", largar);
    alvo.addEventListener("pointercancel", largar);
  }

  const escolhida = escolhidaId ? localizar(agenda, escolhidaId) : null;
  const podeMover = perfil !== "tecnico";

  return (
    <LigacaoAgenda.Provider value={{ vista, ancora }}>
      <div
        className="space-y-4"
        onClick={(evento) => {
          if (arrastou.current) {
            evento.preventDefault();
            evento.stopPropagation();
            arrastou.current = false;
            return;
          }
          const alvo = (evento.target as HTMLElement).closest("[data-ordem]");
          if (alvo instanceof HTMLElement && alvo.dataset.ordem) setEscolhidaId(alvo.dataset.ordem);
        }}
      >
        <details className="superficie px-4 py-3 md:hidden">
          <summary className="cursor-pointer text-sm font-medium">{t("agenda.comoLer")}</summary>
          <div className="pt-3">
            <LegendaGantt perfil={perfil} margem={agenda.margemDeslocacaoMin} podeMover={podeMover} embutida />
          </div>
        </details>
        <div className="hidden md:block">
          <LegendaGantt perfil={perfil} margem={agenda.margemDeslocacaoMin} podeMover={podeMover} />
        </div>
        <p className="sr-only" aria-live="polite">
          {aCalcular ? t("agenda.aValidar") : ""} {erro ?? ""} {aviso ?? ""} {proposta?.mensagem ?? ""}
        </p>
        {aCalcular ? <p className="text-sm text-muted-foreground">{t("agenda.aValidar")}</p> : null}
        {erro ? (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        ) : null}
        {aviso && !proposta ? (
          <p role="status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            {aviso}
          </p>
        ) : null}
        {proposta ? (
          <div className="sticky top-2 z-30 space-y-3 superficie border-primary/40 p-4 shadow-sm">
            <p className="text-sm font-medium">{t("agenda.previsualizacao")}</p>
            <p className="text-sm">
              {localizar(agenda, proposta.ordemId)?.bloco.referencia ?? t("agenda.visita")} → {nomeDaEquipa(agenda, proposta.equipaId)},{" "}
              {formatarDataLocale(proposta.data, idioma)} · {proposta.inicioPlaneado}.
            </p>
            <p className="text-sm">{traduzirNarrativa(m, proposta.mensagem)}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primario} disabled={aCalcular} onClick={() => void confirmar()}>
                {t("agenda.guardarLugar")}
              </button>
              <button type="button" className={secundario} disabled={aCalcular} onClick={desfazer}>
                {t("comum.voltar")}
              </button>
            </div>
          </div>
        ) : null}

        <div className="hidden md:block">
          {vista === "dia" ? (
            <QuadroDia
              dia={agenda.dias[0]}
              fantasma={fantasma}
              arrastandoId={arrastandoId}
              escolhidaId={escolhidaId}
              onPointerDown={iniciarArrasto}
            />
          ) : (
            <QuadroSemana
              dias={agenda.dias}
              fantasma={fantasma}
              arrastandoId={arrastandoId}
              escolhidaId={escolhidaId}
              onPointerDown={iniciarArrasto}
            />
          )}
        </div>

        <ListaMovel agenda={agenda} podeMover={podeMover && !proposta} />

        {escolhida && !proposta ? (
          <Ficha bloco={escolhida.bloco} equipa={escolhida.equipa} data={escolhida.data} agenda={agenda} podeMover={podeMover} />
        ) : null}

        {fantasma ? (
          <div
            className="pointer-events-none fixed z-50 max-w-[14rem] rounded-lg border border-primary bg-card px-2 py-1.5 text-xs shadow-lg"
            style={{ left: fantasma.x + 12, top: fantasma.y + 12 }}
          >
            <p className="font-semibold">{fantasma.rotulo}</p>
            <p className={fantasma.destinoValido ? "text-muted-foreground" : "text-destructive"}>
              {fantasma.destinoValido
                ? t("agenda.destino", {
                    equipa: nomeDaEquipa(agenda, fantasma.equipaId),
                    data: formatarDataLocale(fantasma.data, idioma),
                    hora: formatHHMM(fantasma.inicioMin),
                  })
                : t("agenda.largueEquipa")}
            </p>
          </div>
        ) : null}
      </div>
    </LigacaoAgenda.Provider>
  );
}

function LegendaGantt({
  perfil,
  margem,
  podeMover,
  embutida = false,
}: {
  perfil: Perfil;
  margem: number;
  podeMover: boolean;
  embutida?: boolean;
}) {
  const { t } = useT();
  return (
    <div className={embutida ? "space-y-3" : "space-y-3 superficie p-4"}>
      <LegendaOperadores compacta />
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        <li className="flex items-center gap-2">
          <span className="h-4 w-8 rounded-sm border border-border bg-[repeating-linear-gradient(135deg,#e7e2d8_0_5px,#d4cec2_5px_10px)]" aria-hidden />
          {t("agenda.ocupadaLegenda")}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-8 rounded-sm border border-dashed border-foreground/40 bg-muted" aria-hidden />
          {t("agenda.indispLegenda")}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-8 rounded-sm outline outline-2 outline-destructive" aria-hidden />
          {t("agenda.conflitoLegenda")}
        </li>
        <li>{t("agenda.margemLegenda", { n: margem })}</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        {perfil === "tecnico" ? t("agenda.ajudaTecnico") : podeMover ? t("agenda.ajudaMover") : null}
        {perfil === "despachante" ? t("agenda.ajudaDespacho") : ""}
      </p>
    </div>
  );
}

function QuadroDia({
  dia,
  fantasma,
  arrastandoId,
  escolhidaId,
  onPointerDown,
}: {
  dia: Agenda["dias"][number] | undefined;
  fantasma: Fantasma | null;
  arrastandoId: string | null;
  escolhidaId: string | null;
  onPointerDown: (
    evento: React.PointerEvent<HTMLElement>,
    bloco: BlocoVista,
    data: string,
    equipaId: string,
    modo: ModoArrasto,
  ) => void;
}) {
  const { t, m, idioma } = useT();
  if (!dia) return <p className="text-sm text-muted-foreground">{t("agenda.semDia")}</p>;
  const eixo = eixoDasLinhas(dia.equipas);
  const conflitos = dia.equipas.flatMap((equipa) => equipa.conflitos.map((conflito) => ({ ...conflito, equipa: equipa.nome })));
  return (
    <section className="space-y-2" aria-label={formatarDataLongaLocale(dia.data, idioma)}>
      {conflitos.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive">
          {conflitos.map((conflito) => (
            <li key={`${conflito.equipa}-${conflito.ordemId}-${conflito.tipo}`}>
              {traduzirConflito(m, conflito.tipo, conflito.mensagem)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("agenda.semConflitosDia")}</p>
      )}
      <div className="overflow-x-auto superficie">
        <div className="min-w-[58rem]">
          <div className="grid grid-cols-[11rem_1fr] border-b border-border bg-muted/60">
            <div className="px-3 py-2 text-xs font-medium">{t("comum.equipa")}</div>
            <Escala eixo={eixo} />
          </div>
          {dia.equipas.map((equipa) => (
            <div key={equipa.equipaId} className="grid grid-cols-[11rem_1fr] border-b border-border last:border-b-0">
              <div className="sticky left-0 z-10 flex flex-col justify-center border-r border-border bg-card px-3 py-2">
                <p className="text-sm font-medium leading-tight">{equipa.nome.replace(/^Equipa /, "")}</p>
                <p className="text-xs text-muted-foreground">
                  {equipa.turno ? `${equipa.turno.inicio}–${equipa.turno.fim}` : t("comum.naoTrabalha")}
                </p>
              </div>
              <FaixaTempo
                linha={equipa}
                data={dia.data}
                eixo={eixo}
                fantasma={fantasma}
                arrastandoId={arrastandoId}
                escolhidaId={escolhidaId}
                onPointerDown={onPointerDown}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuadroSemana({
  dias,
  fantasma,
  arrastandoId,
  escolhidaId,
  onPointerDown,
}: {
  dias: Agenda["dias"];
  fantasma: Fantasma | null;
  arrastandoId: string | null;
  escolhidaId: string | null;
  onPointerDown: (
    evento: React.PointerEvent<HTMLElement>,
    bloco: BlocoVista,
    data: string,
    equipaId: string,
    modo: ModoArrasto,
  ) => void;
}) {
  const nomes = new Map<string, string>();
  for (const dia of dias) for (const equipa of dia.equipas) nomes.set(equipa.equipaId, equipa.nome);
  const conflitos = dias.flatMap((dia) =>
    dia.equipas.flatMap((equipa) => equipa.conflitos.map((conflito) => ({ ...conflito, equipa: equipa.nome, data: dia.data }))),
  );
  const { t, m, idioma } = useT();
  const colunas = { gridTemplateColumns: `10rem repeat(${dias.length}, minmax(11.5rem, 1fr))` };
  return (
    <div className="space-y-2">
      {conflitos.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive">
          {conflitos.map((conflito) => (
            <li key={`${conflito.data}-${conflito.equipa}-${conflito.ordemId}-${conflito.tipo}`}>
              {formatarDataLocale(conflito.data, idioma)} · {conflito.equipa}: {traduzirConflito(m, conflito.tipo, conflito.mensagem)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("agenda.semConflitosSemana")}</p>
      )}
      <div className="overflow-x-auto superficie">
        <div className="min-w-[86rem]">
          <div className="grid border-b border-border bg-muted/60" style={colunas}>
            <div className="sticky left-0 z-20 bg-muted/60 px-3 py-2 text-xs font-medium">{t("comum.equipa")}</div>
            {dias.map((dia) => (
              <div key={dia.data} className="border-l border-border px-2 py-2 text-xs font-medium capitalize">
                {rotuloCurto(dia.data, idioma)}
              </div>
            ))}
          </div>
          {[...nomes.entries()].map(([equipaId, nome]) => (
            <div key={equipaId} className="grid border-b border-border last:border-b-0" style={colunas}>
              <div className="sticky left-0 z-20 flex items-center border-r border-border bg-card px-3 py-2 text-sm font-medium">
                {nome.replace(/^Equipa /, "")}
              </div>
              {dias.map((dia) => {
                const linha = dia.equipas.find((equipa) => equipa.equipaId === equipaId);
                if (!linha) return <div key={dia.data} className="min-h-[7.5rem] border-l border-border bg-muted/40" />;
                return (
                  <CelulaSemana
                    key={dia.data}
                    linha={linha}
                    data={dia.data}
                    fantasma={fantasma}
                    arrastandoId={arrastandoId}
                    escolhidaId={escolhidaId}
                    onPointerDown={onPointerDown}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Escala({ eixo }: { eixo: Eixo }) {
  return (
    <div className="relative h-8">
      {horasDoEixo(eixo).map((minuto) => (
        <span
          key={minuto}
          className="absolute top-1 -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground first:translate-x-0 last:-translate-x-full"
          style={{ left: `${percentagem(minuto, eixo)}%` }}
        >
          {formatHHMM(minuto)}
        </span>
      ))}
    </div>
  );
}

function FaixaTempo({
  linha,
  data,
  eixo,
  fantasma,
  arrastandoId,
  escolhidaId,
  onPointerDown,
}: {
  linha: LinhaVista;
  data: string;
  eixo: Eixo;
  fantasma: Fantasma | null;
  arrastandoId: string | null;
  escolhidaId: string | null;
  onPointerDown: (
    evento: React.PointerEvent<HTMLElement>,
    bloco: BlocoVista,
    data: string,
    equipaId: string,
    modo: ModoArrasto,
  ) => void;
}) {
  const { t } = useT();
  const colocados = faixasDosBlocos(linha.blocos);
  const faixas = colocados[0]?.faixas ?? 1;
  const altura = Math.max(88, faixas * 40);
  const turnoInicio = linha.turno ? minutosDe(linha.turno.inicio) : eixo.inicioMin;
  const turnoFim = linha.turno ? minutosDe(linha.turno.fim) : eixo.inicioMin;
  const alvo = fantasma && fantasma.equipaId === linha.equipaId && fantasma.data === data;
  return (
    <div
      data-faixa="1"
      data-modo="tempo"
      data-equipa={linha.equipaId}
      data-dia={data}
      data-inicio={eixo.inicioMin}
      data-fim={eixo.fimMin}
      data-turno={linha.turno ? "1" : "0"}
      className={`relative border-l border-border transition-colors ${
        alvo ? "bg-primary/10 ring-2 ring-inset ring-primary" : linha.turno ? "bg-card" : "bg-muted/50"
      }`}
      style={{ height: altura }}
    >
      {horasDoEixo(eixo).map((minuto) => (
        <span key={minuto} className="absolute inset-y-0 border-l border-border/50" style={{ left: `${percentagem(minuto, eixo)}%` }} />
      ))}
      {linha.turno ? (
        <>
          <span className="pointer-events-none absolute inset-y-0 left-0 bg-muted/60" style={{ width: `${percentagem(turnoInicio, eixo)}%` }} />
          <span className="pointer-events-none absolute inset-y-0 bg-muted/60" style={{ left: `${percentagem(turnoFim, eixo)}%`, right: 0 }} />
        </>
      ) : (
        <p className="pointer-events-none absolute inset-0 flex items-center px-2 text-xs text-muted-foreground">{t("comum.naoTrabalha")}</p>
      )}
      {linha.indisponibilidades.map((bloco) => (
        <span
          key={`${bloco.inicio}-${bloco.motivo}`}
          title={bloco.motivo}
          className="pointer-events-none absolute top-1 bottom-1 rounded-sm border border-dashed border-foreground/30 bg-[repeating-linear-gradient(135deg,transparent_0_4px,rgb(0_0_0/0.08)_4px_8px)]"
          style={{
            left: `${percentagem(bloco.inicioMin, eixo)}%`,
            width: `${Math.max(percentagem(bloco.fimMin, eixo) - percentagem(bloco.inicioMin, eixo), 1)}%`,
          }}
        />
      ))}
      {colocados.map(({ bloco, faixa, faixas: total }) => (
        <Bloco
          key={bloco.id}
          bloco={bloco}
          eixo={eixo}
          faixa={faixa}
          faixas={total}
          compacta={false}
          conflito={linha.conflitos.some((conflito) => conflito.ordemId === bloco.id)}
          mensagem={linha.conflitos.find((conflito) => conflito.ordemId === bloco.id)?.mensagem}
          escolhida={escolhidaId === bloco.id}
          arrastando={arrastandoId === bloco.id}
          onPointerDown={(evento) => onPointerDown(evento, bloco, data, linha.equipaId, "tempo")}
        />
      ))}
      {alvo && fantasma.modo === "tempo" ? (
        <span
          className="pointer-events-none absolute z-20 rounded-md border-2 border-dashed border-primary bg-primary/20"
          style={{
            left: `${percentagem(fantasma.inicioMin, eixo)}%`,
            width: `${Math.max(percentagem(fantasma.inicioMin + fantasma.duracaoMin, eixo) - percentagem(fantasma.inicioMin, eixo), 2)}%`,
            top: 6,
            bottom: 6,
          }}
        />
      ) : null}
    </div>
  );
}

function CelulaSemana({
  linha,
  data,
  fantasma,
  arrastandoId,
  escolhidaId,
  onPointerDown,
}: {
  linha: LinhaVista;
  data: string;
  fantasma: Fantasma | null;
  arrastandoId: string | null;
  escolhidaId: string | null;
  onPointerDown: (
    evento: React.PointerEvent<HTMLElement>,
    bloco: BlocoVista,
    data: string,
    equipaId: string,
    modo: ModoArrasto,
  ) => void;
}) {
  const { t } = useT();
  const alvo = fantasma && fantasma.equipaId === linha.equipaId && fantasma.data === data;
  const visitas = [...linha.blocos].sort((a, b) => a.inicioMin - b.inicioMin);
  return (
    <div
      data-faixa="1"
      data-modo="celula"
      data-equipa={linha.equipaId}
      data-dia={data}
      data-turno={linha.turno ? "1" : "0"}
      className={`flex min-h-[7.5rem] flex-col gap-1.5 border-l border-border p-1.5 transition-colors ${
        !linha.turno ? "bg-muted/50" : alvo ? "bg-primary/10 ring-2 ring-inset ring-primary" : "bg-card"
      }`}
    >
      {!linha.turno ? (
        <p className="m-auto text-xs text-muted-foreground">{t("comum.naoTrabalha")}</p>
      ) : visitas.length === 0 && !alvo ? (
        <p className="m-auto text-[11px] text-muted-foreground">{t("comum.livre")}</p>
      ) : (
        visitas.map((bloco) => (
          <CartaoSemana
            key={bloco.id}
            bloco={bloco}
            conflito={linha.conflitos.some((conflito) => conflito.ordemId === bloco.id)}
            mensagem={linha.conflitos.find((conflito) => conflito.ordemId === bloco.id)?.mensagem}
            escolhida={escolhidaId === bloco.id}
            arrastando={arrastandoId === bloco.id}
            onPointerDown={(evento) => onPointerDown(evento, bloco, data, linha.equipaId, "celula")}
          />
        ))
      )}
      {alvo ? (
        <span className="pointer-events-none rounded-md border border-dashed border-primary px-2 py-1 text-[11px] font-medium text-primary">
          {t("agenda.enviadoPara", { hora: formatHHMM(fantasma.inicioMin) })}
        </span>
      ) : null}
    </div>
  );
}

function Bloco({
  bloco,
  eixo,
  faixa,
  faixas,
  compacta,
  conflito,
  mensagem,
  escolhida,
  arrastando,
  onPointerDown,
}: {
  bloco: BlocoVista;
  eixo: Eixo;
  faixa: number;
  faixas: number;
  compacta: boolean;
  conflito: boolean;
  mensagem?: string;
  escolhida: boolean;
  arrastando: boolean;
  onPointerDown: (evento: React.PointerEvent<HTMLElement>) => void;
}) {
  const { t } = useT();
  const ocupada = bloco.vista === "ocupada";
  const rotulo = ocupada
    ? t("agenda.ocupadaAria", { inicio: bloco.inicio, fim: bloco.fim, n: bloco.duracaoMin })
    : t("agenda.visitaAria", { referencia: bloco.referencia ?? "", cliente: bloco.clienteNome ?? "", inicio: bloco.inicio, fim: bloco.fim });
  const classe = `absolute z-10 overflow-hidden rounded-md border border-border bg-card px-1.5 py-1 text-left ${
    bloco.arrastavel ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer"
  } ${conflito ? "outline outline-2 outline-offset-1 outline-destructive" : ""} ${
    escolhida ? "ring-2 ring-ring ring-offset-1" : ""
  } ${arrastando ? "pointer-events-none opacity-30" : ""}`;
  const estilo: React.CSSProperties = {
    left: `${percentagem(bloco.inicioMin, eixo)}%`,
    width: `${Math.max(percentagem(bloco.fimMin, eixo) - percentagem(bloco.inicioMin, eixo), compacta ? 8 : 5)}%`,
    top: `calc(${(faixa / faixas) * 100}% + 4px)`,
    height: `calc(${100 / faixas}% - 8px)`,
    background: ocupada
      ? "repeating-linear-gradient(135deg,#F4F4F5 0 6px,#E4E4E7 6px 12px)"
      : "#FFFFFF",
    color: ocupada ? "#52525B" : "#18181B",
    boxShadow: ocupada ? undefined : undefined,
    borderLeftWidth: ocupada ? 1 : 3,
    borderLeftColor: ocupada ? "#E4E4E7" : COR_OPERADOR[bloco.operadorId ?? "azul"],
  };
  return (
    <div
      role="button"
      tabIndex={0}
      data-ordem={bloco.id}
      aria-grabbed={arrastando}
      aria-label={rotulo}
      title={mensagem ? `${rotulo}. ${mensagem}` : rotulo}
      onPointerDown={onPointerDown}
      className={classe}
      style={estilo}
    >
      <span className="block truncate font-mono text-[11px]/4 font-medium leading-tight">{ocupada ? t("comum.ocupada") : bloco.referencia}</span>
      <span className="block truncate font-mono text-[11px]/4 leading-tight text-muted-foreground">
        {bloco.inicio}–{bloco.fim}
        {ocupada ? ` · ${bloco.duracaoMin} ${t("comum.minutos")}` : bloco.clienteNome ? ` · ${bloco.clienteNome}` : ""}
      </span>
      {conflito ? <span className="block truncate text-[10px] font-medium leading-tight text-destructive">{t("comum.conflito")}</span> : null}
    </div>
  );
}

function CartaoSemana({
  bloco,
  conflito,
  mensagem,
  escolhida,
  arrastando,
  onPointerDown,
}: {
  bloco: BlocoVista;
  conflito: boolean;
  mensagem?: string;
  escolhida: boolean;
  arrastando: boolean;
  onPointerDown: (evento: React.PointerEvent<HTMLElement>) => void;
}) {
  const { t } = useT();
  const ocupada = bloco.vista === "ocupada";
  const rotulo = ocupada
    ? t("agenda.ocupadaAriaCurta", { inicio: bloco.inicio, fim: bloco.fim })
    : t("agenda.visitaAriaCurta", { referencia: bloco.referencia ?? "", inicio: bloco.inicio, fim: bloco.fim });
  return (
    <div
      role="button"
      tabIndex={0}
      data-ordem={bloco.id}
      aria-grabbed={arrastando}
      aria-label={rotulo}
      title={mensagem ? `${rotulo}. ${mensagem}` : rotulo}
      onPointerDown={onPointerDown}
      className={`rounded-md border border-border bg-card px-2 py-1.5 text-left ${
        bloco.arrastavel ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer"
      } ${conflito ? "outline outline-2 outline-destructive" : ""} ${escolhida ? "ring-2 ring-ring ring-offset-1" : ""} ${
        arrastando ? "pointer-events-none opacity-30" : ""
      }`}
      style={{
        background: ocupada ? "repeating-linear-gradient(135deg,#F4F4F5 0 6px,#E4E4E7 6px 12px)" : "#FFFFFF",
        color: ocupada ? "#52525B" : "#18181B",
        borderLeftWidth: ocupada ? 1 : 3,
        borderLeftColor: ocupada ? "#E4E4E7" : COR_OPERADOR[bloco.operadorId ?? "azul"],
      }}
    >
      <span className="block truncate font-mono text-[11px]/4 font-medium leading-tight">{ocupada ? t("comum.ocupada") : bloco.referencia}</span>
      <span className="block truncate font-mono text-[11px]/4 leading-tight text-muted-foreground">
        {bloco.inicio}–{bloco.fim}
        {ocupada || !bloco.clienteNome ? "" : ` · ${bloco.clienteNome}`}
      </span>
    </div>
  );
}

function Ficha({
  bloco,
  equipa,
  data,
  agenda,
  podeMover,
}: {
  bloco: BlocoVista;
  equipa: LinhaVista;
  data: string;
  agenda: Agenda;
  podeMover: boolean;
}) {
  const conflitos = equipa.conflitos.filter((conflito) => conflito.ordemId === bloco.id);
  const { t, idioma, m } = useT();
  return (
    <section className="hidden space-y-3 superficie p-4 md:block">
      {bloco.vista === "ocupada" ? (
        <div>
          <h2 className="text-base font-semibold tracking-tight">{t("comum.ocupada")}</h2>
          <p className="mt-1 text-sm">
            {t("agenda.ocupadaDetalhe", {
              equipa: equipa.nome,
              data: formatarDataLocale(data, idioma),
              inicio: bloco.inicio,
              fim: bloco.fim,
              n: bloco.duracaoMin,
            })}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {bloco.referencia}
              {bloco.operadorId ? <span className="ml-2 text-base font-sans font-medium">{t(`operador.${bloco.operadorId}`)}</span> : null}
            </h2>
            <p className="mt-1 text-sm">
              {bloco.clienteNome} · {bloco.morada}
            </p>
            <p className="text-sm text-muted-foreground">
              {equipa.nome} · {formatarDataLocale(data, idioma)} · {bloco.inicio}–{bloco.fim}
              {bloco.categoria ? ` · ${t(`categoria.${bloco.categoria}`)}` : ""}
              {bloco.janelaInicio ? ` · ${t("agenda.janelaInicio", { inicio: bloco.janelaInicio, fim: bloco.janelaFim ?? "" })}` : ""}
            </p>
          </div>
          <Link href={`/ordens/${bloco.id}`} className="text-sm underline">
            {t("comum.abrirOrdem")}
          </Link>
        </div>
      )}
      {conflitos.map((conflito) => (
        <p key={conflito.tipo} className="text-sm text-destructive">
          {traduzirConflito(m, conflito.tipo, conflito.mensagem)}
        </p>
      ))}
      {podeMover && bloco.arrastavel ? (
        <FormularioMover
          key={`${bloco.id}-${data}`}
          agenda={agenda}
          ordemId={bloco.id}
          dataInicial={data}
          equipaInicial={equipa.equipaId}
          inicioInicial={bloco.inicio}
        />
      ) : null}
    </section>
  );
}

function FormularioMover({
  agenda,
  ordemId,
  dataInicial,
  equipaInicial,
  inicioInicial,
}: {
  agenda: Agenda;
  ordemId: string;
  dataInicial: string;
  equipaInicial: string;
  inicioInicial: string;
}) {
  const { vista, ancora } = useContext(LigacaoAgenda);
  const { t, idioma } = useT();
  return (
    <form action="/agenda" className="grid gap-3 md:grid-cols-[1fr_1fr_8rem_auto] md:items-end">
      <input type="hidden" name="vista" value={vista} />
      <input type="hidden" name="data" value={ancora} />
      <input type="hidden" name="ordem" value={ordemId} />
      <input type="hidden" name="prever" value="1" />
      <p className="text-sm font-medium md:col-span-4">{t("agenda.enviarEquipa")}</p>
      <label className="space-y-1 text-sm">
        <span className="font-medium">{t("comum.equipa")}</span>
        <select name="equipaId" defaultValue={equipaInicial} className="h-10 w-full rounded-lg border border-input bg-background px-2">
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
        <select name="dia" defaultValue={dataInicial} className="h-10 w-full rounded-lg border border-input bg-background px-2">
          {agenda.dias.map((dia) => (
            <option key={dia.data} value={dia.data}>
              {formatarDataLongaLocale(dia.data, idioma)}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">{t("comum.inicio")}</span>
        <input name="inicio" type="time" step={300} required defaultValue={inicioInicial} className="h-10 w-full rounded-lg border border-input bg-background px-2" />
      </label>
      <button type="submit" className={primario}>
        {t("comum.previsualizar")}
      </button>
    </form>
  );
}

function ListaMovel({ agenda, podeMover }: { agenda: Agenda; podeMover: boolean }) {
  const { t, idioma, m } = useT();
  const nomes = new Map<string, string>();
  for (const dia of agenda.dias) for (const equipa of dia.equipas) nomes.set(equipa.equipaId, equipa.nome);
  return (
    <div className="space-y-4 md:hidden">
      <p className="text-sm text-muted-foreground">{t("agenda.listaTelemovel")}</p>
      {[...nomes.entries()].map(([equipaId, nome]) => {
        const entradas = agenda.dias.flatMap((dia) => {
          const linha = dia.equipas.find((equipa) => equipa.equipaId === equipaId);
          if (!linha) return [];
          return linha.blocos.map((bloco) => ({ bloco, data: dia.data, linha }));
        });
        entradas.sort((a, b) => a.data.localeCompare(b.data) || a.bloco.inicioMin - b.bloco.inicioMin);
        return (
          <section key={equipaId} className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{nome}</h2>
            {entradas.length === 0 ? <p className="text-sm text-muted-foreground">{t("agenda.semVisitasPeriodo")}</p> : null}
            <ul className="space-y-2">
              {entradas.map(({ bloco, data, linha }) => {
                const conflito = linha.conflitos.find((item) => item.ordemId === bloco.id);
                const ocupada = bloco.vista === "ocupada";
                return (
                  <li key={`${data}-${bloco.id}`} className="superficie p-3">
                    <p className="text-xs text-muted-foreground">{formatarDataLongaLocale(data, idioma)}</p>
                    <p className="mt-1 font-medium tabular-nums">
                      {bloco.inicio}–{bloco.fim}
                      {ocupada ? ` · ${t("comum.ocupada")}` : ` · ${bloco.referencia}`}
                    </p>
                    {ocupada ? (
                      <p className="text-sm text-muted-foreground">{t("agenda.semFicha", { n: bloco.duracaoMin })}</p>
                    ) : (
                      <p className="text-sm">
                        {bloco.operadorId ? `${t(`operador.${bloco.operadorId}`)} · ` : ""}
                        {bloco.clienteNome}
                        {bloco.morada ? ` · ${bloco.morada}` : ""}
                      </p>
                    )}
                    {conflito ? (
                      <p className="mt-1 text-sm text-destructive">{traduzirConflito(m, conflito.tipo, conflito.mensagem)}</p>
                    ) : null}
                    {!ocupada ? (
                      <Link href={`/ordens/${bloco.id}`} className="mt-1 inline-block text-sm underline">
                        {t("comum.abrirOrdem")}
                      </Link>
                    ) : null}
                    {podeMover && bloco.arrastavel ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm">{t("agenda.enviarEquipa")}</summary>
                        <div className="mt-2">
                          <FormularioMover
                            agenda={agenda}
                            ordemId={bloco.id}
                            dataInicial={data}
                            equipaInicial={equipaId}
                            inicioInicial={bloco.inicio}
                          />
                        </div>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
