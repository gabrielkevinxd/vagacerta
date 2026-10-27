import { falha, type Competencia, type Falha, type OperadorId, type Tecnologia } from "./tipos";
import { OPERADORES } from "./tipos";

const AZUL = ["instalacao", "suporte", "adicional"] as Competencia["categorias"];
const VERMELHO = ["instalacao", "suporte", "adicional"] as Competencia["categorias"];
const VERDE = ["instalacao", "suporte", "adicional", "desligamento"] as Competencia["categorias"];
const TECNOLOGIAS_VERDE: Tecnologia[] = ["FTTH", "CABO", "DTH", "SEA", "ALARMES"];

/** Competências-padrão por operador servido (equipas partilham a frota; só muda quem servem). */
export function competenciaPadrao(operadorId: OperadorId): Competencia {
  if (operadorId === "azul") return { operadorId, categorias: [...AZUL], tecnologias: [] };
  if (operadorId === "vermelho") return { operadorId, categorias: [...VERMELHO], tecnologias: [] };
  return { operadorId, categorias: [...VERDE], tecnologias: [...TECNOLOGIAS_VERDE] };
}

export function competenciasDeOperadores(operadores: readonly OperadorId[]): Competencia[] {
  return normalizarOperadoresServidos(operadores).map(competenciaPadrao);
}

export function normalizarOperadoresServidos(operadores: readonly string[]): OperadorId[] {
  const unicos = [...new Set(operadores)].filter((id): id is OperadorId => (OPERADORES as readonly string[]).includes(id));
  return OPERADORES.filter((id) => unicos.includes(id));
}

export function validarOperadoresServidos(operadores: readonly string[]): OperadorId[] | Falha {
  const normalizados = normalizarOperadoresServidos(operadores);
  if (normalizados.length === 0) {
    return falha("OPERADORES_SERVIDOS", "A equipa tem de servir pelo menos um operador.");
  }
  if (normalizados.length > 3) {
    return falha("OPERADORES_SERVIDOS", "A equipa não pode servir mais do que os três operadores.");
  }
  return normalizados;
}

export const OPERADORES_SERVIDOS_PADRAO: readonly OperadorId[] = [...OPERADORES];
