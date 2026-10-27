import type { EstadoOrdem, OperadorId, Papel } from "./tipos";

export interface Ator {
  id: string;
  nome: string;
  papel: Papel;
  operadorId: OperadorId | null;
  tecnicoId: string | null;
  equipaId: string | null;
}

export type Vista = "completa" | "ocupada" | "oculta";

export function eCentral(ator: Ator): boolean {
  return ator.papel === "administrador" || ator.papel === "supervisor";
}

export function vistaDaOrdem(ator: Ator, ordem: { operadorId: string; equipaId: string | null }): Vista {
  if (eCentral(ator)) return "completa";
  if (ator.papel === "despachante") {
    return ator.operadorId && ator.operadorId === ordem.operadorId ? "completa" : "ocupada";
  }
  if (ator.papel === "tecnico") {
    return ordem.equipaId && ator.equipaId && ordem.equipaId === ator.equipaId ? "completa" : "oculta";
  }
  return "oculta";
}

/** A lista de ordens nunca devolve linhas de outro operador ao despachante, nem de outra equipa ao técnico. */
export function podeLerOrdem(ator: Ator, ordem: { operadorId: string; equipaId: string | null }): boolean {
  return vistaDaOrdem(ator, ordem) === "completa";
}

export function podeMarcarOperador(ator: Ator, operadorId: string): boolean {
  if (eCentral(ator)) return true;
  if (ator.papel === "despachante") return ator.operadorId === operadorId;
  return false;
}

export function podeGerirEquipas(ator: Ator): boolean {
  return eCentral(ator);
}

export function podeVerEquipa(ator: Ator, equipaId: string): boolean {
  if (ator.papel === "tecnico") return ator.equipaId === equipaId;
  return true;
}

export function podeReencaiarGlobal(ator: Ator): boolean {
  return eCentral(ator);
}

export function estadoCancelavel(estado: EstadoOrdem): boolean {
  if (estado === "cancelada" || estado === "concluida") return false;
  return estado === "pendente" || estado === "em_espera" || estado === "agendada" || estado === "em_curso";
}

export function podeCancelar(
  ator: Ator,
  ordem: { operadorId: string; equipaId: string | null; estado?: EstadoOrdem },
): boolean {
  if (!podeLerOrdem(ator, ordem)) return false;
  if (ator.papel === "tecnico") return false;
  if (ordem.estado && !estadoCancelavel(ordem.estado)) return false;
  return true;
}

export function podeReagendar(ator: Ator, ordem: { operadorId: string; equipaId: string | null; estado: EstadoOrdem }): boolean {
  if (ordem.estado !== "agendada") return false;
  if (ator.papel === "tecnico") return false;
  return podeLerOrdem(ator, ordem);
}

const SEQUENCIA_TECNICO: Record<string, EstadoOrdem[]> = {
  agendada: ["em_curso"],
  em_curso: ["concluida"],
};

export function podeMudarEstado(
  ator: Ator,
  ordem: { operadorId: string; equipaId: string | null; estado: EstadoOrdem },
  destino: EstadoOrdem,
): boolean {
  if (!podeLerOrdem(ator, ordem)) return false;
  if (destino === ordem.estado) return false;
  if (ator.papel === "tecnico") return SEQUENCIA_TECNICO[ordem.estado]?.includes(destino) ?? false;
  if (destino === "cancelada") return podeCancelar(ator, ordem);
  if (eCentral(ator) || ator.papel === "despachante") {
    if (ordem.estado === "cancelada" || ordem.estado === "concluida") return false;
    return destino === "pendente" || destino === "em_espera" || destino === "agendada" || destino === "em_curso" || destino === "concluida";
  }
  return false;
}
