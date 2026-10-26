import type { OperadorId, Tecnologia } from "@/lib/rules";
import type { TipoIntervencao } from "./quotas";

export const OPERADORES_OFSC = ["azul", "vermelho", "verde"] as const;
export type OperadorOfsc = (typeof OPERADORES_OFSC)[number];

export const BUCKET_DST = "DST_TELECOM";

export type TipoEventoOfsc = "activityCreated" | "activityUpdated";

export const CAMPOS_RESERVA = [
  "zona",
  "data",
  "janelaInicio",
  "janelaFim",
  "tipoIntervencao",
  "resourceId",
  "operadorId",
  "apptNumber",
] as const;

export type CampoReserva = (typeof CAMPOS_RESERVA)[number];

export interface LocalOfsc {
  customerName: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  latitude: string;
  longitude: string;
}

export interface ReservaEstruturada extends LocalOfsc {
  zona: string;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  tipoIntervencao: TipoIntervencao;
  resourceId: string;
  tecnicoId: string | null;
  operadorId: OperadorOfsc;
  apptNumber: string;
  activityId?: string;
}

export interface AtividadeOfsc extends LocalOfsc {
  activityId: string;
  resourceId: string | null;
  bucket: string;
  status: string;
  date: string;
  timeSlot: { start: string; end: string };
  workZone: string;
  apptNumber: string;
  tipoIntervencao: TipoIntervencao;
  technician: string | null;
  activityType: TipoIntervencao;
  technology: Tecnologia | null;
  customerPhone: string;
  address: string;
  note: string;
}

export interface EventoOfsc {
  eventType: TipoEventoOfsc;
  operator: OperadorOfsc;
  activity: AtividadeOfsc;
}

export interface AusenciaOfsc {
  id: string;
  resourceId: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
}

export type DecisaoReserva = "Reserva Confirmada" | "Reserva Recusada";

export function eOperadorOfsc(valor: string): valor is OperadorOfsc {
  return OPERADORES_OFSC.includes(valor as OperadorOfsc);
}

export function eOperadorId(valor: string): valor is OperadorId {
  return eOperadorOfsc(valor);
}

export function atividadeVazia(operadorId: OperadorOfsc): AtividadeOfsc {
  return {
    activityId: "",
    resourceId: null,
    bucket: BUCKET_DST,
    status: "pending",
    date: "",
    timeSlot: { start: "", end: "" },
    workZone: "",
    apptNumber: "",
    tipoIntervencao: "instalacao",
    technician: null,
    activityType: "instalacao",
    technology: null,
    customerName: "",
    customerPhone: "",
    streetAddress: "",
    city: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    address: "",
    note: "",
  };
}
