"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  zona: "zn-n01",
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
    grelha: string;
    grelhaVazia: string;
    camposConfirmar: string;
    emFalta: string;
    operadores: Record<OperadorId, string>;
    tipos: Record<Formulario["tipoIntervencao"], string>;
    campos: Record<keyof Formulario, string>;
    cenariosRotulo: Record<(typeof CENARIOS)[number], string>;
  };
}) {
  const [operador, setOperador] = useState<OperadorId>("azul");
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

  const colunas = useMemo(
    () =>
      [
        { id: "origem" as const, titulo: textos.colunaOrigem },
        { id: "vagacerta" as const, titulo: textos.colunaVaga },
        { id: "outros" as const, titulo: textos.colunaOutros },
      ] as const,
    [textos],
  );

  const local = ["customerName", "streetAddress", "city", "postalCode", "latitude", "longitude"] as const;

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted-foreground">{textos.corpo}</p>

      <section className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{textos.escolherOperador}</span>
            <select
              className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
              value={operador}
              onChange={(e) => setOperador(e.target.value as OperadorId)}
            >
              {(["azul", "vermelho", "verde"] as const).map((id) => (
                <option key={id} value={id}>
                  {textos.operadores[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{textos.campos.data}</span>
            <input
              className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
              type="date"
              value={form.data}
              onChange={(e) => campo("data", e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{textos.campos.tipoIntervencao}</span>
            <select
              className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
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
        {celulas.length === 0 ? <p className="text-sm text-muted-foreground">{textos.grelhaVazia}</p> : null}
        <div className="overflow-x-auto superficie border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-2 py-2">{textos.campos.zona}</th>
                <th className="px-2 py-2">{textos.campos.tecnicoId}</th>
                <th className="px-2 py-2">{textos.campos.tipoIntervencao}</th>
                <th className="px-2 py-2">{textos.campos.janelaInicio}</th>
                <th className="px-2 py-2">N → N-1</th>
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
                      {celula.vagasTipo} → {Math.max(0, celula.vagasTipo - 1)}
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
            <label key={chave} className="text-sm">
              <span className="mb-1 block text-muted-foreground">{textos.campos[chave]}</span>
              <input
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={form[chave]}
                onChange={(e) => campo(chave, e.target.value)}
                required={chave !== "tecnicoId"}
              />
            </label>
          ))}
        </div>
        <p className="text-xs font-medium text-muted-foreground">{textos.camposConfirmar}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {local.map((chave) => (
            <label key={chave} className="text-sm">
              <span className="mb-1 block text-muted-foreground">{textos.campos[chave]}</span>
              <input
                className="h-10 w-full rounded-lg border border-dashed border-input bg-background px-2 text-sm"
                value={form[chave]}
                onChange={(e) => campo(chave, e.target.value)}
              />
            </label>
          ))}
        </div>
        {emFalta.length > 0 ? (
          <p className="text-sm text-destructive">
            {textos.emFalta}: {emFalta.join(", ")}
          </p>
        ) : null}
        <Button type="submit" disabled={aEnviar}>
          {aEnviar ? textos.aEnviar : textos.confirmar}
        </Button>
        {decisao ? <p className="text-sm font-medium">{decisao}</p> : null}
      </form>

      <form onSubmit={atalho} className="grid gap-3 superficie border-dashed p-4 md:grid-cols-[1fr_auto]">
        <label className="text-sm">
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
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

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

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">{textos.consola}</h2>
          <p className="text-xs text-muted-foreground">{textos.retries.replace("{n}", String(retries))}</p>
        </div>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">{textos.vazio}</p> : null}
        <div className="grid gap-3 lg:grid-cols-3">
          {colunas.map((coluna) => (
            <div key={coluna.id} className="min-h-48 superficie p-3">
              <h3 className="mb-2 text-sm font-medium">{coluna.titulo}</h3>
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
                        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px]">{log.pedido}</pre>
                      ) : null}
                      {log.resposta ? (
                        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px]">{log.resposta}</pre>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
