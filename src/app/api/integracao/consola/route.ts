import { api } from "@/server/http";
import { exigirIntegracao } from "@/server/autorizacao";
import { ErroHttp } from "@/server/erros";
import { filtrarLogsDespachante, listarAtividades, listarLogs, listarRetries } from "@/server/ofsc/loja";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";

export const GET = api(async (ator, pedido) => {
  exigirIntegracao(ator);
  const url = new URL(pedido.url);
  const depoisDe = url.searchParams.get("depoisDe") ?? undefined;
  const operadorPedido = url.searchParams.get("operador") ?? "azul";
  if (ator.papel === "despachante") {
    if (!ator.operadorId) {
      throw new ErroHttp(403, "SEM_PERMISSAO", "Só vê a capacidade do seu operador.");
    }
    const operador = ator.operadorId;
    const logsBrutos = listarLogs(depoisDe, 120, { operadorId: operador });
    const logs = filtrarLogsDespachante(logsBrutos, operador);
    const retries = listarRetries()
      .filter((r) => r.operador_id === operador)
      .map((r) => ({ id: r.id }));
    return {
      logs,
      retries,
      atividades: eOperadorOfsc(operador) ? listarAtividades(operador) : [],
    };
  }
  return {
    logs: listarLogs(depoisDe),
    retries: listarRetries(),
    atividades: eOperadorOfsc(operadorPedido) ? listarAtividades(operadorPedido) : [],
  };
});
