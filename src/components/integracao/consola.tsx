"use client";

import { useEffect, useMemo, useState } from "react";
import { SeletorData } from "@/components/seletor-data";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight } from "lucide-react";
import { enviar } from "@/lib/cliente";
import type { OperadorId } from "@/lib/rules";

const CENARIOS = [
  "vaga_livre",
  "capacidade_esgotada",
  "zona_fechada",
  "fora_da_janela",
  "tecnico_indisponivel",
  "reagendamento",
  "cancelamento_reencaixe",
  "falta_equipa",
  "dois_operadores",
  "evento_duplicado",
  "ofsc_em_baixo",
] as const;

type Log = {
  id: string;
  quando: string;
  coluna: "origem" | "vagacerta" | "outros";
  historia: string;
  metodo: string | null;
  caminho: string | null;
  pedido: string | null;
  resposta: string | null;
  codigo: number | null;
};

type Celula = {
  zonaId: string;
  zonaNome: string;
  equipaId: string;
  equipaNome: string;
  tecnicoId: string;
  tecnicoNome: string;
  resourceId: string;
  tipo: "instalacao" | "manutencao" | "adicional";
  janelaInicio: string;
  janelaFim: string;
  vagasTipo: number;
  vagasInstalacao: number;
  vagasManutencao: number;
};

type Formulario = {
  zona: string;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  tipoIntervencao: "instalacao" | "manutencao" | "adicional";
  resourceId: string;
  tecnicoId: string;
  apptNumber: string;
  customerName: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  latitude: string;
  longitude: string;
};

const FORM_VAZIO: Formulario = {
  zona: "0303",
  data: "2026-11-03",
  janelaInicio: "",
  janelaFim: "",
  tipoIntervencao: "instalacao",
  resourceId: "",
  tecnicoId: "",
  apptNumber: "",
  customerName: "",
  streetAddress: "",
  city: "Braga",
  postalCode: "",
  latitude: "",
  longitude: "",
};

export function ConsolaIntegracao({
  textos,
  operadorFixo = null,
  esconderOutros = false,
  mostrarCenarios = true,
}: {
  textos: {
    corpo: string;
    escolherOperador: string;
    pedido: string;
    exemplo: string;
    atalho: string;
    aplicarAtalho: string;
    enviar: string;
    aEnviar: string;
    confirmar: string;
    modoIa: string;
    modoSemIa: string;
    colunaOrigem: string;
    colunaVaga: string;
    colunaOutros: string;
    consola: string;
    cenarios: string;
    vazio: string;
    retries: string;
    quota: string;
    repetir: string;
    esgotada: string;
    verPedido: string;
    verResposta: string;
    grelha: string;
    grelhaVazia: string;
    camposConfirmar: string;
    emFalta: string;
    operadores: Record<OperadorId, string>;
    tipos: Record<Formulario["tipoIntervencao"], string>;
    campos: Record<keyof Formulario, string>;
    cenariosRotulo: Record<(typeof CENARIOS)[number], string>;
  };
  operadorFixo?: OperadorId | null;
  esconderOutros?: boolean;
  mostrarCenarios?: boolean;
}) {
  const [operador, setOperador] = useState<OperadorId>(operadorFixo ?? "azul");
  const [texto, setTexto] = useState(textos.exemplo);
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);
  const [emFalta, setEmFalta] = useState<string[]>([]);
  const [modo, setModo] = useState<"ia" | "sem_ia" | null>(null);
  const [detalhe, setDetalhe] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [decisao, setDecisao] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [retries, setRetries] = useState(0);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [zonas, setZonas] = useState<{ id: string; codigo: string; nome: string }[]>([]);

  function campo<K extends keyof Formulario>(chave: K, valor: Formulario[K]) {
    setForm((atual) => ({ ...atual, [chave]: valor }));
  }

  async function refrescar() {
    const dados = await enviar<{ logs: Log[]; retries: { id: string }[] }>(
      `/api/integracao/consola?operador=${operador}`,
      undefined,
      "GET",
    );
    setLogs(dados.logs as Log[]);
    setRetries(dados.retries.length);
  }

  async function refrescarGrelha() {
    const q = new URLSearchParams({
      operador,
      data: form.data,
      zona: form.zona,
      tipo: form.tipoIntervencao,
    });
    const dados = await enviar<{ celulas: Celula[] }>(`/api/integracao/vagas?${q}`, undefined, "GET");
    setCelulas(dados.celulas);
  }

  useEffect(() => {
    void enviar<{ id: string; codigo: string; nome: string }[]>("/api/zonas", undefined, "GET")
      .then((lista) => {
        setZonas(lista);
        if (lista[0] && form.zona === FORM_VAZIO.zona && !lista.some((z) => z.id === form.zona)) {
          setForm((atual) => ({ ...atual, zona: lista[0]!.id }));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void refrescar().catch(() => undefined);
    const id = window.setInterval(() => {
      void refrescar().catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(id);
  }, [operador]);

  useEffect(() => {
    void refrescarGrelha().catch(() => undefined);
  }, [operador, form.data, form.zona, form.tipoIntervencao]);

  async function atalho(ev: React.FormEvent) {
    ev.preventDefault();
    setAEnviar(true);
    setErro(null);
    try {
      const resposta = await enviar<{
        modo: "ia" | "sem_ia";
        detalhe: string;
        extraidos: Partial<Formulario>;
        emFalta: string[];
      }>("/api/integracao/agente", { operadorId: operador, texto });
      setModo(resposta.modo);
      setDetalhe(resposta.detalhe);
      setEmFalta(resposta.emFalta);
      setForm((atual) => ({
        ...atual,
        ...Object.fromEntries(Object.entries(resposta.extraidos).filter(([, v]) => v !== undefined && v !== "")),
      }));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : textos.vazio);
    } finally {
      setAEnviar(false);
    }
  }

  async function confirmar(ev: React.FormEvent) {
    ev.preventDefault();
    setAEnviar(true);
    setErro(null);
    setDecisao(null);
    try {
      const resposta = await enviar<{ resultado: { decisao?: string; motivo?: string; contador?: string } }>(
        "/api/integracao/reserva",
        { ...form, operadorId: operador, tecnicoId: form.tecnicoId || null },
      );
      const d = resposta.resultado;
      setDecisao([d.decisao, d.motivo, d.contador].filter(Boolean).join(" — "));
      await refrescar();
      await refrescarGrelha();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : textos.vazio);
    } finally {
      setAEnviar(false);
    }
  }

  async function cenario(id: (typeof CENARIOS)[number]) {
    setErro(null);
    try {
      await enviar("/api/integracao/cenarios", { id });
      await refrescar();
      await refrescarGrelha();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : id);
    }
  }

  const colunas = useMemo(() => {
    const base = [
      { id: "origem" as const, titulo: textos.colunaOrigem },
      { id: "vagacerta" as const, titulo: textos.colunaVaga },
    ];
    if (esconderOutros) return base;
    return [...base, { id: "outros" as const, titulo: textos.colunaOutros }];
  }, [textos, esconderOutros]);

  const local = ["customerName", "streetAddress", "city", "postalCode", "latitude", "longitude"] as const;

  return (
    <div className="space-y-4">
      <p className="text-[13px]/5 text-muted-foreground">{textos.corpo}</p>

      <section className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[13px]/5">
            <span className="mb-1 block text-muted-foreground">{textos.escolherOperador}</span>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-[13px]/5"
              value={operador}
              disabled={Boolean(operadorFixo)}
              onChange={(e) => setOperador(e.target.value as OperadorId)}
            >
              {(operadorFixo ? [operadorFixo] : (["azul", "vermelho", "verde"] as const)).map((id) => (
                <option key={id} value={id}>
                  {textos.operadores[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px]/5">
            <span className="mb-1 block text-muted-foreground">{textos.campos.data}</span>
            <SeletorData valor={form.data} onChange={(iso) => campo("data", iso)} className="min-w-[10rem]" />
          </label>
          <label className="text-[13px]/5">
            <span className="mb-1 block text-muted-foreground">{textos.campos.tipoIntervencao}</span>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-[13px]/5"
              value={form.tipoIntervencao}
              onChange={(e) => campo("tipoIntervencao", e.target.value as Formulario["tipoIntervencao"])}
            >
              {(["instalacao", "manutencao", "adicional"] as const).map((id) => (
                <option key={id} value={id}>
                  {textos.tipos[id]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <h2 className="text-base font-semibold tracking-tight">{textos.grelha}</h2>
        {celulas.length === 0 ? <p className="text-[13px]/5 text-muted-foreground">{textos.grelhaVazia}</p> : null}
        <div className="overflow-x-auto superficie border">
          <table className="w-full min-w-[40rem] text-left text-[13px]/5">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-2 py-2">{textos.campos.zona}</th>
                <th className="px-2 py-2">{textos.campos.tecnicoId}</th>
                <th className="px-2 py-2">{textos.campos.tipoIntervencao}</th>
                <th className="px-2 py-2">{textos.campos.janelaInicio}</th>
                <th className="px-2 py-2">{textos.quota}</th>
              </tr>
            </thead>
            <tbody>
              {celulas.map((celula) => (
                <tr key={`${celula.resourceId}-${celula.tecnicoId}-${celula.janelaInicio}-${celula.tipo}`}>
                  <td className="px-2 py-1">{celula.zonaNome}</td>
                  <td className="px-2 py-1">{celula.tecnicoNome}</td>
                  <td className="px-2 py-1">{textos.tipos[celula.tipo]}</td>
                  <td className="px-2 py-1">
                    {celula.janelaInicio}–{celula.janelaFim}
                  </td>
                  <td className="px-2 py-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={celula.vagasTipo <= 0}
                      onClick={() =>
                        setForm((atual) => ({
                          ...atual,
                          zona: celula.zonaId,
                          janelaInicio: celula.janelaInicio,
                          janelaFim: celula.janelaFim,
                          tipoIntervencao: celula.tipo,
                          resourceId: celula.resourceId,
                          tecnicoId: celula.tecnicoId,
                          city: celula.zonaNome,
                        }))
                      }
                    >
                      {celula.vagasTipo <= 0
                        ? textos.esgotada
                        : textos.repetir.replace("{n}", String(celula.vagasTipo))}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form onSubmit={confirmar} className="space-y-3 superficie p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              "zona",
              "data",
              "janelaInicio",
              "janelaFim",
              "resourceId",
              "tecnicoId",
              "apptNumber",
            ] as const
          ).map((chave) => (
            <label key={chave} className="text-[13px]/5">
              <span className="mb-1 block text-muted-foreground">{textos.campos[chave]}</span>
              {chave === "data" ? (
                <SeletorData valor={form.data} onChange={(iso) => campo("data", iso)} required />
              ) : chave === "zona" ? (
                <select
                  className="h-8 w-full rounded-lg border border-input bg-background px-2 text-[13px]/5"
                  value={form.zona}
                  onChange={(e) => campo("zona", e.target.value)}
                  required
                >
                  {zonas.length === 0 ? <option value={form.zona}>{form.zona}</option> : null}
                  {zonas.map((zona) => (
                    <option key={zona.id} value={zona.id}>
                      {zona.codigo} · {zona.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="h-8 w-full rounded-lg border border-input bg-background px-2 text-[13px]/5"
                  value={form[chave]}
                  onChange={(e) => campo(chave, e.target.value)}
                  required={chave !== "tecnicoId"}
                />
              )}
            </label>
          ))}
        </div>
        <p className="text-xs font-medium text-muted-foreground">{textos.camposConfirmar}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {local.map((chave) => (
            <label key={chave} className="text-[13px]/5">
              <span className="mb-1 block text-muted-foreground">{textos.campos[chave]}</span>
              <input
                className="h-8 w-full rounded-lg border border-dashed border-input bg-background px-2 text-[13px]/5"
                value={form[chave]}
                onChange={(e) => campo(chave, e.target.value)}
              />
            </label>
          ))}
        </div>
        {emFalta.length > 0 ? (
          <p className="text-[13px]/5 text-destructive">
            {textos.emFalta}: {emFalta.join(", ")}
          </p>
        ) : null}
        <Button type="submit" disabled={aEnviar}>
          {aEnviar ? textos.aEnviar : textos.confirmar}
        </Button>
        {decisao ? <p className="text-[13px]/5 font-medium">{decisao}</p> : null}
      </form>

      <form onSubmit={atalho} className="grid gap-3 superficie border-dashed p-4 md:grid-cols-[1fr_auto]">
        <label className="text-[13px]/5">
          <span className="mb-1 block text-muted-foreground">{textos.atalho}</span>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} />
        </label>
        <div className="flex flex-col justify-end gap-2">
          <Button type="submit" variant="outline" disabled={aEnviar}>
            {textos.aplicarAtalho}
          </Button>
          {modo ? (
            <p className="text-xs text-muted-foreground">
              {modo === "ia" ? textos.modoIa : textos.modoSemIa}
              {detalhe ? ` — ${detalhe}` : ""}
            </p>
          ) : null}
        </div>
      </form>
      {erro ? <p className="text-[13px]/5 text-destructive">{erro}</p> : null}

      {mostrarCenarios ? (
        <section className="space-y-2">
          <h2 className="text-base font-semibold tracking-tight">{textos.cenarios}</h2>
          <div className="flex flex-wrap gap-2">
            {CENARIOS.map((id) => (
              <Button key={id} type="button" variant="outline" size="sm" onClick={() => void cenario(id)}>
                {textos.cenariosRotulo[id]}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">{textos.consola}</h2>
          <p className="text-xs text-muted-foreground">{textos.retries.replace("{n}", String(retries))}</p>
        </div>
        {logs.length === 0 ? <p className="text-[13px]/5 text-muted-foreground">{textos.vazio}</p> : null}
        <div className={`grid min-w-0 gap-3 ${esconderOutros ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
          {colunas.map((coluna) => (
            <div key={coluna.id} className="min-w-0 superficie p-3">
              <h3 className="mb-2 text-[13px]/5 font-medium">{coluna.titulo}</h3>
              <ScrollArea className="h-[calc(100vh-13rem)] pr-2">
                <ul className="space-y-3">
                  {logs
                    .filter((log) => log.coluna === coluna.id)
                    .map((log) => (
                      <li key={log.id} className="rounded-lg bg-muted/60 p-2 text-xs">
                        <p className="font-medium">{log.historia}</p>
                        {log.metodo && log.caminho ? (
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            {log.metodo} {log.caminho}
                            {log.codigo != null ? ` → ${log.codigo}` : ""}
                          </p>
                        ) : null}
                        {log.pedido ? (
                          <Collapsible className="mt-1">
                            <CollapsibleTrigger className="inline-flex items-center gap-1 text-[11px]/4 font-medium text-muted-foreground hover:text-foreground">
                              <ChevronRight className="size-3.5 transition-transform [[data-state=open]_&]:rotate-90" strokeWidth={1.75} />
                              {textos.verPedido}
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">{log.pedido}</pre>
                            </CollapsibleContent>
                          </Collapsible>
                        ) : null}
                        {log.resposta ? (
                          <Collapsible className="mt-1">
                            <CollapsibleTrigger className="inline-flex items-center gap-1 text-[11px]/4 font-medium text-muted-foreground hover:text-foreground">
                              <ChevronRight className="size-3.5 transition-transform [[data-state=open]_&]:rotate-90" strokeWidth={1.75} />
                              {textos.verResposta}
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">{log.resposta}</pre>
                            </CollapsibleContent>
                          </Collapsible>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </ScrollArea>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
