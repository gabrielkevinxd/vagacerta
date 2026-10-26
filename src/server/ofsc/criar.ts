import "server-only";

import { BUCKET_DST, type AtividadeOfsc, type OperadorOfsc, type ReservaEstruturada } from "@/lib/ofsc/tipos";
import { guardarAtividade, lerAtividade, registarLog } from "./loja";
import { processarEventoOfsc } from "./recetor";

export function atividadeDeReserva(reserva: ReservaEstruturada, activityId?: string): AtividadeOfsc {
  return {
    activityId: activityId ?? reserva.activityId ?? `act-${crypto.randomUUID()}`,
    resourceId: reserva.resourceId,
    bucket: BUCKET_DST,
    status: "pending",
    date: reserva.data,
    timeSlot: { start: reserva.janelaInicio, end: reserva.janelaFim },
    workZone: reserva.zona,
    apptNumber: reserva.apptNumber,
    tipoIntervencao: reserva.tipoIntervencao,
    technician: reserva.tecnicoId,
    activityType: reserva.tipoIntervencao,
    technology: reserva.operadorId === "verde" ? "FTTH" : null,
    customerName: reserva.customerName,
    customerPhone: "",
    streetAddress: reserva.streetAddress,
    city: reserva.city,
    postalCode: reserva.postalCode,
    latitude: reserva.latitude,
    longitude: reserva.longitude,
    address: reserva.streetAddress,
    note: "",
  };
}

export async function criarAtividadeNoBucket(reserva: ReservaEstruturada, activityId?: string) {
  const atividade = atividadeDeReserva(reserva, activityId);
  guardarAtividade(reserva.operadorId, atividade, null, reserva.apptNumber);
  registarLog("origem", `Atividade ${atividade.activityId} (${atividade.apptNumber}) no bucket ${BUCKET_DST}.`, {
    metodo: "INTERNAL",
    caminho: `/ofsc/${reserva.operadorId}/bucket/${BUCKET_DST}`,
    pedido: atividade,
    codigo: 201,
  });
  const resultado = await processarEventoOfsc({
    eventType: "activityCreated",
    operator: reserva.operadorId,
    activity: atividade,
  });
  return { atividade, resultado };
}

export async function actualizarAtividadeOfsc(
  operadorId: OperadorOfsc,
  activityId: string,
  campos: Partial<Pick<AtividadeOfsc, "status" | "date">> & { timeSlot?: AtividadeOfsc["timeSlot"] },
) {
  const previa = lerAtividade(activityId);
  if (!previa || previa.operador_id !== operadorId) throw new Error("Atividade OFSC inexistente.");
  const corpo = JSON.parse(previa.corpo_json) as AtividadeOfsc;
  const atividade: AtividadeOfsc = {
    ...corpo,
    status: campos.status ?? corpo.status,
    date: campos.date ?? corpo.date,
    timeSlot: campos.timeSlot ?? corpo.timeSlot,
  };
  guardarAtividade(operadorId, atividade, previa.ordem_id, previa.referencia);
  return processarEventoOfsc({ eventType: "activityUpdated", operator: operadorId, activity: atividade });
}
