/**
 * Contrato do gémeo digital. Monte Carlo com semente 20261027.
 * A simulação não grava ordens na base.
 */

import type { OperadorId } from "@/lib/rules";

export const SEMENTE_GEMEO = 20261027;

export const POLITICAS_GEMEO = ["independente", "partilhada", "reencaixe"] as const;
export type PoliticaId = (typeof POLITICAS_GEMEO)[number];

export interface PedidoGemeo {
  /** Por omissão, 20261027. A mesma semente reproduz os mesmos números. */
  semente?: number;
  semanas?: number;
  replicas?: number;
  margemDeslocacaoMin?: number;
  /** Multiplicador da procura diária. 1 é o ritmo base. */
  procura?: number;
  /** Probabilidade de uma equipa faltar num dia útil, entre 0 e 1. */
  probabilidadeFalta?: number;
  pesos?: { azul: number; vermelho: number; verde: number };
}

export interface MetricasPolitica {
  id: PoliticaId;
  aceites: number;
  recusadas: number;
  sobreReservas: number;
  sobreReservasEvitadas: number;
  minutosOcupados: number;
  minutosOciosos: number;
  minutosCapacidade: number;
  utilizacao: number;
}

export interface RelatorioGemeo {
  semente: number;
  replicas: number;
  semanas: number;
  ordensGeradas: number;
  politicas: MetricasPolitica[];
  /** Uma série curta para o gráfico diário. A política partilhada é a de referência. */
  serieDiaria: { data: string; utilizacao: number; recusadas: number; sobreReservasEvitadas: number }[];
  nota: string;
  comparacao?: ComparacaoOperador[];
}

export interface ComparacaoOperador {
  operadorId: OperadorId;
  aceitesPartilhadas: number;
  aceitesIndependentes: number;
}

export interface IndicadoresDia {
  data: string;
  utilizacao: number;
  minutosOcupados: number;
  minutosOciosos: number;
  minutosCapacidade: number;
  recusadas: number;
  sobreReservas: number;
  sobreReservasEvitadas: number;
}
