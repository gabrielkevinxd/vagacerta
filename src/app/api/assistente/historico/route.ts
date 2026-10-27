import { limparHistoricoAssistente } from "@/server/assistente-historico";
import { ErroHttp } from "@/server/erros";
import { api } from "@/server/http";

function exigirAssistente(ator: { papel: string }) {
  if (ator.papel === "tecnico") {
    throw new ErroHttp(403, "SEM_PERMISSAO", "Esta área não está disponível para o perfil de técnico.");
  }
}

/** Limpa o histórico do assistente do utilizador autenticado. */
export const DELETE = api(async (ator) => {
  exigirAssistente(ator);
  limparHistoricoAssistente(ator.id);
  return { ok: true };
});
