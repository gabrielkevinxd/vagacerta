import type { Chave } from "./index";

/** Bases com variantes `_um` / `_outros` (não existem como chave sozinhas). */
export const BASES_PLURAIS = [
  "assistente.verAlertas",
  "assistente.generico",
  "assistente.contagem.agendadas",
  "assistente.contagem.espera",
  "assistente.contagem.pendentes",
  "assistente.contagem.curso",
  "assistente.contagem.alertas",
] as const;

export type BasePlural = (typeof BASES_PLURAIS)[number];
export type ChavePlural = `${BasePlural}_um` | `${BasePlural}_outros`;

export function eBasePlural(chave: string): chave is BasePlural {
  return (BASES_PLURAIS as readonly string[]).includes(chave);
}

/** Uma chave de leitura do assistente: catálogo normal ou base plural. */
export type ChaveLeitura = Chave | BasePlural;
