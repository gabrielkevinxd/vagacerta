import "server-only";

import { eCentral, type Ator } from "@/lib/rules";
import { ErroHttp } from "@/server/erros";

/** Integração OFSC (consola, vagas, reserva, agente): sessão sim, técnico não. */
export function exigirIntegracao(ator: Ator): void {
  if (ator.papel === "tecnico") {
    throw new ErroHttp(403, "SEM_PERMISSAO", "O técnico não acede à integração OFSC.");
  }
}

export function exigirCentral(ator: Ator, mensagem = "Só a central pode executar esta ação."): void {
  if (!eCentral(ator)) {
    throw new ErroHttp(403, "SEM_PERMISSAO", mensagem);
  }
}
