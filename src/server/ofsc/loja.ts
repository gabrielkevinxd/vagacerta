import "server-only";

import { baseDados } from "@/server/db";
import type { OperadorOfsc } from "@/lib/ofsc/tipos";
import { BUCKET_DST, type AtividadeOfsc } from "@/lib/ofsc/tipos";

export function recursoDaEquipa(operadorId: OperadorOfsc, equipaId: string): string | null {
  const linha = baseDados()
    .prepare("SELECT resource_id FROM ofsc_recursos WHERE operador_id = ? AND equipa_id = ?")
    .get(operadorId, equipaId) as { resource_id: string } | undefined;
  return linha?.resource_id ?? null;
}

export function equipaDoRecurso(operadorId: OperadorOfsc, resourceId: string): string | null {
  const linha = baseDados()
    .prepare("SELECT equipa_id FROM ofsc_recursos WHERE operador_id = ? AND resource_id = ?")
    .get(operadorId, resourceId) as { equipa_id: string } | undefined;
  return linha?.equipa_id ?? null;
}

export function recursosDaEquipa(equipaId: string): { operadorId: OperadorOfsc; resourceId: string }[] {
  return (
    baseDados().prepare("SELECT operador_id, resource_id FROM ofsc_recursos WHERE equipa_id = ?").all(equipaId) as {
      operador_id: OperadorOfsc;
      resource_id: string;
    }[]
  ).map((linha) => ({ operadorId: linha.operador_id, resourceId: linha.resource_id }));
}

export function ofscEmBaixo(operadorId: OperadorOfsc): boolean {
  const linha = baseDados().prepare("SELECT em_baixo FROM ofsc_saude WHERE operador_id = ?").get(operadorId) as
    | { em_baixo: number }
    | undefined;
  return Number(linha?.em_baixo) === 1;
}

export function definirOfscEmBaixo(operadorId: OperadorOfsc, emBaixo: boolean): void {
  baseDados()
    .prepare("INSERT INTO ofsc_saude (operador_id, em_baixo) VALUES (?, ?) ON CONFLICT(operador_id) DO UPDATE SET em_baixo = excluded.em_baixo")
    .run(operadorId, emBaixo ? 1 : 0);
}

export function guardarAtividade(operadorId: OperadorOfsc, atividade: AtividadeOfsc, ordemId: string | null, referencia: string | null): void {
  const agora = new Date().toISOString();
  const existente = baseDados().prepare("SELECT activity_id FROM ofsc_atividades WHERE activity_id = ?").get(atividade.activityId);
  const corpo = JSON.stringify(atividade);
  if (existente) {
    baseDados()
      .prepare(
        `UPDATE ofsc_atividades SET resource_id = ?, estado = ?, data = ?, janela_inicio = ?, janela_fim = ?,
         categoria = ?, tecnologia = ?, area = ?, cliente_nome = ?, morada = ?, nota = ?, ordem_id = ?, referencia = ?,
         corpo_json = ?, atualizada_em = ? WHERE activity_id = ?`,
      )
      .run(
        atividade.resourceId,
        atividade.status,
        atividade.date,
        atividade.timeSlot.start,
        atividade.timeSlot.end,
        atividade.activityType,
        atividade.technology,
        atividade.city,
        atividade.customerName,
        atividade.address,
        atividade.note,
        ordemId,
        referencia,
        corpo,
        agora,
        atividade.activityId,
      );
    return;
  }
  baseDados()
    .prepare(
      `INSERT INTO ofsc_atividades (activity_id, operador_id, resource_id, bucket, estado, data, janela_inicio, janela_fim,
        categoria, tecnologia, area, zona_id, cliente_nome, cliente_contacto, morada, nota, referencia, ordem_id, corpo_json, criada_em, atualizada_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      atividade.activityId,
      operadorId,
      atividade.resourceId,
      atividade.bucket || BUCKET_DST,
      atividade.status,
      atividade.date,
      atividade.timeSlot.start,
      atividade.timeSlot.end,
      atividade.activityType,
      atividade.technology,
      atividade.city,
      "zn-n01",
      atividade.customerName,
      atividade.customerPhone,
      atividade.address,
      atividade.note,
      referencia,
      ordemId,
      corpo,
      agora,
      agora,
    );
}

export function lerAtividade(activityId: string): {
  activity_id: string;
  operador_id: OperadorOfsc;
  resource_id: string | null;
  estado: string;
  data: string;
  janela_inicio: string;
  janela_fim: string;
  ordem_id: string | null;
  referencia: string | null;
  corpo_json: string;
} | undefined {
  return baseDados().prepare("SELECT * FROM ofsc_atividades WHERE activity_id = ?").get(activityId) as
    | {
        activity_id: string;
        operador_id: OperadorOfsc;
        resource_id: string | null;
        estado: string;
        data: string;
        janela_inicio: string;
        janela_fim: string;
        ordem_id: string | null;
        referencia: string | null;
        corpo_json: string;
      }
    | undefined;
}

export function listarAtividades(operadorId: OperadorOfsc, limite = 20) {
  return baseDados()
    .prepare("SELECT * FROM ofsc_atividades WHERE operador_id = ? ORDER BY atualizada_em DESC LIMIT ?")
    .all(operadorId, limite);
}

export function patchAtividade(operadorId: OperadorOfsc, activityId: string, resourceId: string | null) {
  const linha = lerAtividade(activityId);
  if (!linha || linha.operador_id !== operadorId) return { ok: false as const, codigo: 404, mensagem: "activity not found" };
  baseDados()
    .prepare("UPDATE ofsc_atividades SET resource_id = ?, atualizada_em = ? WHERE activity_id = ?")
    .run(resourceId, new Date().toISOString(), activityId);
  return { ok: true as const, activityId, resourceId };
}

export function criarAusencia(
  operadorId: OperadorOfsc,
  resourceId: string,
  dados: { date: string; startTime: string; endTime: string; name: string; activityId?: string | null },
) {
  const id = `abs-${crypto.randomUUID()}`;
  baseDados()
    .prepare(
      "INSERT INTO ofsc_ausencias (id, operador_id, resource_id, activity_id, data, inicio, fim, nome, criada_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      operadorId,
      resourceId,
      dados.activityId ?? null,
      dados.date,
      dados.startTime,
      dados.endTime,
      dados.name,
      new Date().toISOString(),
    );
  return { id, resourceId, ...dados };
}

export function patchAusencia(
  operadorId: OperadorOfsc,
  resourceId: string,
  id: string,
  dados: { date?: string; startTime?: string; endTime?: string; name?: string },
) {
  const linha = baseDados()
    .prepare("SELECT * FROM ofsc_ausencias WHERE id = ? AND operador_id = ? AND resource_id = ?")
    .get(id, operadorId, resourceId) as { id: string } | undefined;
  if (!linha) return { ok: false as const, codigo: 404, mensagem: "absence not found" };
  const actual = baseDados().prepare("SELECT * FROM ofsc_ausencias WHERE id = ?").get(id) as {
    data: string;
    inicio: string;
    fim: string;
    nome: string;
  };
  baseDados()
    .prepare("UPDATE ofsc_ausencias SET data = ?, inicio = ?, fim = ?, nome = ? WHERE id = ?")
    .run(dados.date ?? actual.data, dados.startTime ?? actual.inicio, dados.endTime ?? actual.fim, dados.name ?? actual.nome, id);
  return { ok: true as const, id };
}

export function apagarAusencia(operadorId: OperadorOfsc, resourceId: string, id: string) {
  const info = baseDados()
    .prepare("DELETE FROM ofsc_ausencias WHERE id = ? AND operador_id = ? AND resource_id = ?")
    .run(id, operadorId, resourceId);
  if (Number(info.changes) === 0) return { ok: false as const, codigo: 404, mensagem: "absence not found" };
  return { ok: true as const, id };
}

export function ausenciasDaAtividade(activityId: string) {
  return baseDados()
    .prepare("SELECT * FROM ofsc_ausencias WHERE activity_id = ?")
    .all(activityId) as {
    id: string;
    operador_id: OperadorOfsc;
    resource_id: string;
    data: string;
    inicio: string;
    fim: string;
    nome: string;
  }[];
}

export function eventoJaProcessado(activityId: string, assinatura: string): boolean {
  return Boolean(
    baseDados()
      .prepare("SELECT 1 FROM integracao_eventos WHERE activity_id = ? AND assinatura = ?")
      .get(activityId, assinatura),
  );
}

export function marcarProcessado(activityId: string, assinatura: string, tipo: string, resultado: string): void {
  baseDados()
    .prepare(
      "INSERT OR IGNORE INTO integracao_eventos (activity_id, assinatura, tipo, processado_em, resultado) VALUES (?, ?, ?, ?, ?)",
    )
    .run(activityId, assinatura, tipo, new Date().toISOString(), resultado);
}

export function enfileirarRetry(operadorId: OperadorOfsc, metodo: string, caminho: string, corpo: unknown, erro: string): void {
  baseDados()
    .prepare(
      "INSERT INTO integracao_retries (id, operador_id, metodo, caminho, corpo, tentativas, ultimo_erro, criado_em) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .run(`rty-${crypto.randomUUID()}`, operadorId, metodo, caminho, JSON.stringify(corpo), erro, new Date().toISOString());
}

export function listarRetries() {
  return baseDados().prepare("SELECT * FROM integracao_retries ORDER BY criado_em").all() as {
    id: string;
    operador_id: OperadorOfsc;
    metodo: string;
    caminho: string;
    corpo: string;
    tentativas: number;
    ultimo_erro: string | null;
  }[];
}

export function apagarRetry(id: string): void {
  baseDados().prepare("DELETE FROM integracao_retries WHERE id = ?").run(id);
}

export function incrementarRetry(id: string, erro: string): void {
  baseDados()
    .prepare("UPDATE integracao_retries SET tentativas = tentativas + 1, ultimo_erro = ? WHERE id = ?")
    .run(erro, id);
}

export type ColunaConsola = "origem" | "vagacerta" | "outros";

/** Marcador explícito de log global (visível a todos os despachantes). `null` nunca é global. */
export const OPERADOR_LOG_GLOBAL = "*" as const;
export type OperadorLog = OperadorOfsc | typeof OPERADOR_LOG_GLOBAL;

export type LinhaLog = {
  id: string;
  quando: string;
  coluna: ColunaConsola;
  historia: string;
  metodo: string | null;
  caminho: string | null;
  pedido: string | null;
  resposta: string | null;
  codigo: number | null;
  operador_id: OperadorLog | null;
};

export function registarLog(
  coluna: ColunaConsola,
  historia: string,
  extra?: {
    metodo?: string;
    caminho?: string;
    pedido?: unknown;
    resposta?: unknown;
    codigo?: number;
    operadorId?: OperadorLog | null;
  },
): void {
  baseDados()
    .prepare(
      "INSERT INTO integracao_logs (id, quando, coluna, historia, metodo, caminho, pedido, resposta, codigo, operador_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      `log-${crypto.randomUUID()}`,
      new Date().toISOString(),
      coluna,
      historia,
      extra?.metodo ?? null,
      extra?.caminho ?? null,
      extra?.pedido === undefined ? null : JSON.stringify(extra.pedido),
      extra?.resposta === undefined ? null : JSON.stringify(extra.resposta),
      extra?.codigo ?? null,
      extra?.operadorId ?? null,
    );
}

export function listarLogs(
  depoisDe?: string,
  limite = 120,
  filtro?: { operadorId: string },
): LinhaLog[] {
  if (filtro?.operadorId) {
    const op = filtro.operadorId;
    if (depoisDe) {
      return baseDados()
        .prepare(
          `SELECT * FROM integracao_logs
           WHERE quando > ?
             AND coluna != 'outros'
             AND (operador_id = ? OR operador_id = ?)
           ORDER BY quando
           LIMIT ?`,
        )
        .all(depoisDe, op, OPERADOR_LOG_GLOBAL, limite) as LinhaLog[];
    }
    return baseDados()
      .prepare(
        `SELECT * FROM integracao_logs
         WHERE coluna != 'outros'
           AND (operador_id = ? OR operador_id = ?)
         ORDER BY quando DESC
         LIMIT ?`,
      )
      .all(op, OPERADOR_LOG_GLOBAL, limite)
      .reverse() as LinhaLog[];
  }
  if (depoisDe) {
    return baseDados()
      .prepare("SELECT * FROM integracao_logs WHERE quando > ? ORDER BY quando LIMIT ?")
      .all(depoisDe, limite) as LinhaLog[];
  }
  return baseDados().prepare("SELECT * FROM integracao_logs ORDER BY quando DESC LIMIT ?").all(limite).reverse() as LinhaLog[];
}

/** Logs visíveis ao despachante: nunca «outros»; só o próprio operador; globais só com marcador explícito. */
export function filtrarLogsDespachante(logs: LinhaLog[], operadorId: string): LinhaLog[] {
  return logs.filter(
    (log) =>
      log.coluna !== "outros" &&
      (log.operador_id === operadorId || log.operador_id === OPERADOR_LOG_GLOBAL),
  );
}

export function ligarOrdem(activityId: string, ordemId: string, referencia: string): void {
  baseDados()
    .prepare("UPDATE ofsc_atividades SET ordem_id = ?, referencia = ?, atualizada_em = ? WHERE activity_id = ?")
    .run(ordemId, referencia, new Date().toISOString(), activityId);
}
