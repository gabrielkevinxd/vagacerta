/**
 * Contrato do assistente de despacho. Este módulo declara tipos; a implementação
 * (interpretador determinístico e, se houver chave, o modelo) fica para o agente seguinte.
 * Sem `LLM_API_KEY`, o fallback tem de ser determinístico e chamar `reencaixar`.
 */

import type { PedidoRealocacao, PlanoVista } from "@/lib/rules";

export interface MensagemDespacho {
  papel: "utilizador" | "assistente";
  texto: string;
  em: string;
}

export interface ContextoDespacho {
  hoje: string;
  atorId: string;
  operadorId: string | null;
  margemDeslocacaoMin: number;
}

/** Intenção que o interpretador devolve. Nunca grava por si. */
export type IntencaoDespacho =
  | { tipo: "reencaixar"; pedido: PedidoRealocacao }
  | { tipo: "esclarecer"; pergunta: string }
  | { tipo: "recusar"; mensagem: string };

export interface RespostaAssistente {
  mensagem: MensagemDespacho;
  intencao: IntencaoDespacho;
  /** Preenchido quando a intenção é reencaixar e o motor devolveu um plano. */
  plano: PlanoVista | null;
}

export interface PedidoAssistente {
  texto: string;
  /** Confirma o plano anteriormente selado. Sem isto, a rota só pré-visualiza. */
  confirmar?: { selo: string; pedido: PedidoRealocacao };
}
