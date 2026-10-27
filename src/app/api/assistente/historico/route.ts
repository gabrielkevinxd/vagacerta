import { limparHistoricoAssistente } from "@/server/assistente-historico";
import { ErroHttp } from "@/server/erros";
import { api } from "@/server/http";
import { obterTokenSessao } from "@/server/sessao";

function exigirAssistente(ator: { papel: string }) {
  if (ator.papel === "tecnico") {
    throw new ErroHttp(403, "SEM_PERMISSAO", "Esta área não está disponível para o perfil de técnico.");
  }
}

/** Limpa o histórico do assistente desta sessão (não das outras sessões da mesma conta). */
export const DELETE = api(async (ator) => {
  exigirAssistente(ator);
  const token = await obterTokenSessao();
  if (!token) throw new ErroHttp(401, "NAO_AUTENTICADO", "Inicie sessão para continuar.");
  limparHistoricoAssistente(token);
  return { ok: true };
});
