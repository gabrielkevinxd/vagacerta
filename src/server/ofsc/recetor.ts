import "server-only";

import { createHash } from "node:crypto";
import { BUCKET_DST, eOperadorOfsc, type EventoOfsc, type OperadorOfsc } from "@/lib/ofsc/tipos";
import { categoriaDoTipo, fraseContador, tipoDeCategoria } from "@/lib/ofsc/quotas";
import { AREAS, NOME_OPERADOR } from "@/lib/rules";
import { baseDados, ordemDeLinha } from "@/server/db";
import { ErroHttp } from "@/server/erros";
import { confirmarPlano, criarOrdem, marcarJa, mudarEstado, previsualizar, reagendar } from "@/server/servicos";
import { chamarOfsc } from "./cliente";
import { avaliarReserva, type CelulaVaga } from "./grelha";
import {
  ausenciasDaAtividade,
  eventoJaProcessado,
  guardarAtividade,
  lerAtividade,
  ligarOrdem,
  marcarProcessado,
  recursoDaEquipa,
  recursosDaEquipa,
  registarLog,
} from "./loja";
import type { Ator, OperadorId } from "@/lib/rules";

export const ATOR_OFSC: Ator = {
  id: "usr-admin",
  nome: "Integração OFSC",
  papel: "administrador",
  operadorId: null,
  tecnicoId: null,
  equipaId: null,
};

const filas = new Map<string, Promise<unknown>>();

async function comBloqueio<T>(chave: string, trabalho: () => T | Promise<T>): Promise<T> {
  const anterior = filas.get(chave) ?? Promise.resolve();
  let libertar: () => void = () => undefined;
  const actual = new Promise<void>((resolver) => {
    libertar = resolver;
  });
  const cadeia = anterior.then(() => actual);
  filas.set(chave, cadeia);
  await anterior;
  try {
    return await trabalho();
  } finally {
    libertar();
    if (filas.get(chave) === cadeia) filas.delete(chave);
  }
}

function assinaturaEvento(evento: EventoOfsc): string {
  const a = evento.activity;
  return createHash("sha256")
    .update(
      JSON.stringify([
        evento.eventType,
        evento.operator,
        a.activityId,
        a.status,
        a.date,
        a.timeSlot.start,
        a.timeSlot.end,
        a.resourceId,
        a.workZone,
        a.apptNumber,
      ]),
    )
    .digest("hex");
}

function prefixo(operador: OperadorId): string {
  return operador === "azul" ? "AZ" : operador === "vermelho" ? "VR" : "VD";
}

export async function processarEventoOfsc(evento: EventoOfsc): Promise<{
  duplicado: boolean;
  decisao: "Reserva Confirmada" | "Reserva Recusada" | "duplicado" | "cancelada" | "reagendada";
  motivo?: string;
  alternativa?: CelulaVaga | null;
  resultado: string;
  ordemId: string | null;
  estado?: string;
  equipaId?: string | null;
  resourceId?: string | null;
  contador?: string;
}> {
  if (!eOperadorOfsc(evento.operator)) throw new ErroHttp(400, "DADOS_INVALIDOS", "Operador OFSC desconhecido.");
  const recurso = evento.activity.resourceId ?? "bucket";
  const linha = recurso
    ? (baseDados().prepare("SELECT equipa_id FROM ofsc_recursos WHERE resource_id = ?").get(recurso) as
        | { equipa_id: string }
        | undefined)
    : undefined;
  const chaveEquipa = `dia:${evento.activity.date}|${linha?.equipa_id ?? recurso}`;
  return comBloqueio(chaveEquipa, () => comBloqueio("sqlite", () => aplicar(evento)));
}

function aplicar(evento: EventoOfsc) {
  const assinatura = assinaturaEvento(evento);
  if (eventoJaProcessado(evento.activity.activityId, assinatura)) {
    registarLog("vagacerta", `Evento duplicado ${evento.eventType} ${evento.activity.activityId}: ignorado.`, {
      metodo: "POST",
      caminho: "/api/integracao/ofsc/eventos",
      pedido: evento,
      resposta: { duplicado: true },
      codigo: 200,
    });
    return { duplicado: true, decisao: "duplicado" as const, resultado: "duplicado", ordemId: null };
  }

  const origem = evento.operator;
  const act = evento.activity;
  guardarAtividade(origem, act, null, null);
  registarLog(
    "origem",
    `OFSC do ${NOME_OPERADOR[origem]} enviou ${evento.eventType} (${act.activityId}, appt ${act.apptNumber || "—"}) no bucket ${act.bucket || BUCKET_DST}.`,
    { metodo: "POST", caminho: "/api/integracao/ofsc/eventos", pedido: evento, codigo: 202 },
  );

  const cancelado = /cancel/i.test(act.status);
  const previa = lerAtividade(act.activityId);

  if (cancelado && previa?.ordem_id) {
    const vista = mudarEstado(ATOR_OFSC, previa.ordem_id, "cancelada", "Cancelamento OFSC", "operador");
    apagarAusencias(origem, act.activityId, vista.equipaNome ?? "Técnico");
    reencaixarFila(vista.data);
    marcarProcessado(act.activityId, assinatura, evento.eventType, "cancelada");
    registarLog("vagacerta", `${vista.referencia} cancelada. Quota libertada.`);
    return { duplicado: false, decisao: "cancelada" as const, resultado: "cancelada", ordemId: vista.id, estado: "cancelada" };
  }

  if (previa?.ordem_id && evento.eventType === "activityUpdated" && !cancelado) {
    const vista = reagendar(ATOR_OFSC, previa.ordem_id, {
      data: act.date,
      janelaInicio: act.timeSlot.start,
      janelaFim: act.timeSlot.end,
    });
    atualizarAusencias(origem, act.activityId, vista);
    confirmarRecurso(origem, act.activityId, vista.equipaId, "Reserva Confirmada");
    marcarProcessado(act.activityId, assinatura, evento.eventType, "reagendada");
    return {
      duplicado: false,
      decisao: "reagendada" as const,
      resultado: "reagendada",
      ordemId: vista.id,
      estado: vista.estado,
      equipaId: vista.equipaId,
    };
  }

  const tipo = act.tipoIntervencao || tipoDeCategoria(act.activityType);
  const avaliacao = avaliarReserva({
    operadorId: origem,
    zona: act.workZone,
    data: act.date,
    janelaInicio: act.timeSlot.start,
    janelaFim: act.timeSlot.end,
    tipoIntervencao: tipo,
    resourceId: act.resourceId,
    tecnicoId: act.technician,
  });

  if (!avaliacao.ok || !avaliacao.celula) {
    const recusa = recusar(origem, act.activityId, avaliacao.motivo ?? "Capacidade Esgotada", avaliacao.alternativa ?? null);
    marcarProcessado(act.activityId, assinatura, evento.eventType, recusa.motivo);
    return {
      duplicado: false,
      decisao: "Reserva Recusada" as const,
      motivo: recusa.motivo,
      alternativa: avaliacao.alternativa,
      resultado: recusa.motivo,
      ordemId: null,
      resourceId: null,
    };
  }

  const celula = avaliacao.celula;
  const referencia = act.apptNumber?.trim() || `${prefixo(origem)}-OF${act.activityId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`;
  const area =
    (AREAS as readonly string[]).includes(act.city) ? act.city : (AREAS as readonly string[]).includes(celula.zonaNome) ? celula.zonaNome : "Aveiro";
  let vista;
  try {
    vista = criarOrdem(ATOR_OFSC, {
      operadorId: origem,
      referencia,
      area,
      zonaId: celula.zonaId,
      categoria: categoriaDoTipo(tipo),
      tecnologia: origem === "verde" ? "FTTH" : null,
      data: act.date,
      janelaInicio: act.timeSlot.start,
      janelaFim: act.timeSlot.end,
      prioridade: "media",
      clienteNome: act.customerName || "Cliente OFSC",
      clienteContacto: act.customerPhone || "000000000",
      morada: act.streetAddress || act.address || celula.zonaNome,
      nota: `OFSC ${act.apptNumber} lat=${act.latitude} lon=${act.longitude} cp=${act.postalCode}`,
      equipaId: celula.equipaId,
      modo: "agendar",
    });
  } catch (erro) {
    if (!(erro instanceof ErroHttp) || (erro.codigo !== "INVIAVEL" && erro.codigo !== "REFERENCIA_DUPLICADA")) throw erro;
    if (erro.codigo === "REFERENCIA_DUPLICADA") throw erro;
    const recusa = recusar(origem, act.activityId, "Capacidade Esgotada", avaliacao.alternativa ?? null);
    marcarProcessado(act.activityId, assinatura, evento.eventType, recusa.motivo);
    return {
      duplicado: false,
      decisao: "Reserva Recusada" as const,
      motivo: recusa.motivo,
      alternativa: avaliacao.alternativa,
      resultado: recusa.motivo,
      ordemId: null,
    };
  }

  ligarOrdem(act.activityId, vista.id, vista.referencia);
  confirmarRecurso(origem, act.activityId, vista.equipaId, "Reserva Confirmada");
  const contador = fraseContador(celula.tecnicoNome, act.date, tipo, avaliacao.vagasDe, avaliacao.vagasPara);
  if (vista.equipaId && vista.inicioPlaneado && vista.fimPlaneado) {
    criarAusenciasOutros(origem, act.activityId, vista.equipaId, vista.data, vista.inicioPlaneado, vista.fimPlaneado, contador);
  }
  marcarProcessado(act.activityId, assinatura, evento.eventType, "Reserva Confirmada");
  registarLog("vagacerta", `Reserva Confirmada: ${vista.referencia} na ${celula.equipaNome}. ${contador} (${avaliacao.vagasDe} → ${avaliacao.vagasPara}).`);
  return {
    duplicado: false,
    decisao: "Reserva Confirmada" as const,
    resultado: "Reserva Confirmada",
    ordemId: vista.id,
    estado: vista.estado,
    equipaId: vista.equipaId,
    resourceId: celula.resourceId,
    contador,
  };
}

function recusar(origem: OperadorOfsc, activityId: string, motivo: string, alternativa: CelulaVaga | null) {
  const sugestao = alternativa
    ? ` Alternativa: ${alternativa.tecnicoNome}, ${alternativa.zonaNome}, ${alternativa.janelaInicio}–${alternativa.janelaFim}, ${alternativa.vagasTipo} vagas.`
    : "";
  chamarOfsc(
    origem,
    origem,
    "PATCH",
    `/activities/${activityId}`,
    { resourceId: null, decisao: "Reserva Recusada", motivo },
    `Reserva Recusada: ${motivo}.${sugestao}`,
  );
  registarLog("vagacerta", `Reserva Recusada: ${motivo}.${sugestao}`);
  return { motivo };
}

function confirmarRecurso(origem: OperadorOfsc, activityId: string, equipaId: string | null, decisao: string): void {
  const resourceId = equipaId ? recursoDaEquipa(origem, equipaId) : null;
  chamarOfsc(
    origem,
    origem,
    "PATCH",
    `/activities/${activityId}`,
    { resourceId, decisao },
    `${decisao}: PATCH /activities/${activityId} com resourceId ${resourceId}.`,
  );
}

function criarAusenciasOutros(
  origem: OperadorOfsc,
  activityId: string,
  equipaId: string,
  data: string,
  inicio: string,
  fim: string,
  contador: string,
): void {
  for (const recurso of recursosDaEquipa(equipaId)) {
    if (recurso.operadorId === origem) continue;
    chamarOfsc(
      origem,
      recurso.operadorId,
      "POST",
      `/resources/${recurso.resourceId}/absences`,
      { date: data, startTime: inicio, endTime: fim, name: "DST Telecom", activityId, contador },
      `POST /resources/${recurso.resourceId}/absences — ${contador}`,
    );
  }
}

function atualizarAusencias(
  origem: OperadorOfsc,
  activityId: string,
  vista: { data: string; inicioPlaneado: string | null; fimPlaneado: string | null },
): void {
  for (const ausencia of ausenciasDaAtividade(activityId)) {
    chamarOfsc(
      origem,
      ausencia.operador_id,
      "PATCH",
      `/resources/${ausencia.resource_id}/absences/${ausencia.id}`,
      {
        date: vista.data,
        startTime: vista.inicioPlaneado ?? ausencia.inicio,
        endTime: vista.fimPlaneado ?? ausencia.fim,
      },
      `PATCH /resources/${ausencia.resource_id}/absences/${ausencia.id}`,
    );
  }
}

function apagarAusencias(origem: OperadorOfsc, activityId: string, tecnico: string): void {
  for (const ausencia of ausenciasDaAtividade(activityId)) {
    chamarOfsc(
      origem,
      ausencia.operador_id,
      "DELETE",
      `/resources/${ausencia.resource_id}/absences/${ausencia.id}`,
      undefined,
      `DELETE /resources/${ausencia.resource_id}/absences/${ausencia.id} — ${tecnico}`,
    );
  }
}

function reencaixarFila(data: string): void {
  const linhas = baseDados()
    .prepare("SELECT * FROM ordens WHERE estado = 'em_espera' AND data = ? ORDER BY prioridade, criada_em")
    .all(data) as Record<string, string | number | null>[];
  for (const linha of linhas) {
    const ordem = ordemDeLinha(linha);
    try {
      const vista = marcarJa(ATOR_OFSC, ordem.id);
      if (!vista.equipaId) continue;
      const act = baseDados()
        .prepare("SELECT activity_id, operador_id FROM ofsc_atividades WHERE ordem_id = ?")
        .get(vista.id) as { activity_id: string; operador_id: OperadorOfsc } | undefined;
      if (act && vista.inicioPlaneado && vista.fimPlaneado) {
        confirmarRecurso(act.operador_id, act.activity_id, vista.equipaId, "Reserva Confirmada");
        criarAusenciasOutros(
          act.operador_id,
          act.activity_id,
          vista.equipaId,
          vista.data,
          vista.inicioPlaneado,
          vista.fimPlaneado,
          `${vista.equipaNome}, ${vista.data}`,
        );
      }
    } catch {
      /* ainda não cabe */
    }
  }
}

export function publicarFaltaEquipa(equipaId: string, data: string, motivo: string): void {
  const pedido = { equipaEmFalta: equipaId, data, permitirTroca: true, motivo };
  const previa = previsualizar(ATOR_OFSC, pedido);
  if (previa.viavel) confirmarPlano(ATOR_OFSC, pedido, previa.selo);
  for (const recurso of recursosDaEquipa(equipaId)) {
    chamarOfsc(
      "azul",
      recurso.operadorId,
      "POST",
      `/resources/${recurso.resourceId}/absences`,
      { date: data, startTime: "00:00", endTime: "23:59", name: motivo || "Falta da equipa" },
      `Falta da equipa: POST ausência em todos os OFSC (${recurso.resourceId}).`,
    );
  }
  registarLog("vagacerta", `Falta da equipa ${equipaId} em ${data}: ausências em todos os operadores.`);
}
