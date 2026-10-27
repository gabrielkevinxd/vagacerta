/**
 * Contrato do assistente de despacho.
 * A gravação só acontece com `confirmar` e passa por `confirmarPlano`
 * (o mesmo selo, a mesma transação e as mesmas regras de `POST /api/otimizar/confirmar`).
 * Sem `XAI_API_KEY`, a resposta é determinística.
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

export type TipoAlerta = "sobrelotacao" | "quota_esgotada" | "tecnico_ausente" | "sem_tecnico" | "sobreposicao";

export interface AlertaAssistente {
  id: string;
  tipo: TipoAlerta;
  gravidade: "alta" | "media";
  titulo: string;
  detalhe: string;
  data: string;
  pedido: PedidoRealocacao | null;
}

export interface PainelAssistente {
  data: string;
  modoChat: "ia" | "sem_ia";
  modelo: string | null;
  podePropor: boolean;
  resumo: string;
  alertas: AlertaAssistente[];
}

export interface RespostaAssistente {
  mensagem: MensagemDespacho;
  intencao: IntencaoDespacho;
  /** Preenchido quando a intenção é reencaixar e o motor devolveu um plano. */
  plano: PlanoVista | null;
  modo: "ia" | "sem_ia";
  /** Verdadeiro só depois de `confirmar` ter gravado. */
  gravado: boolean;
  origem: string;
}

export interface PedidoAssistente {
  texto: string;
  /** Confirma o plano anteriormente selado. Sem isto, a rota só pré-visualiza. */
  confirmar?: { selo: string; pedido: PedidoRealocacao };
  /** Pré-visualiza este pedido, sem gravar. O servidor volta a validar o perfil. */
  propor?: PedidoRealocacao;
  data?: string;
  historico?: { papel: "utilizador" | "assistente"; texto: string }[];
}
