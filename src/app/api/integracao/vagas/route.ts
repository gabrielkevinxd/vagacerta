import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { eTipoIntervencao } from "@/lib/ofsc/quotas";
import { exigirIntegracao } from "@/server/autorizacao";
import { ErroHttp } from "@/server/erros";
import { api } from "@/server/http";
import { listarGrelha } from "@/server/ofsc/grelha";

export const GET = api(async (ator, pedido) => {
  exigirIntegracao(ator);
  const url = new URL(pedido.url);
  const omisso = ator.operadorId ?? "azul";
  const operadorPedido = url.searchParams.get("operador") ?? omisso;
  let operador = operadorPedido;
  if (ator.papel === "despachante") {
    if (!ator.operadorId) {
      throw new ErroHttp(403, "SEM_PERMISSAO", "Só vê a capacidade do seu operador.");
    }
    if (operadorPedido !== ator.operadorId) {
      throw new ErroHttp(403, "SEM_PERMISSAO", "Só vê a capacidade do seu operador.");
    }
    operador = ator.operadorId;
  }
  const data = url.searchParams.get("data") ?? "";
  const zona = url.searchParams.get("zona") ?? undefined;
  const tipo = url.searchParams.get("tipo") ?? undefined;
  if (!eOperadorOfsc(operador) || !data) return { celulas: [] };
  return {
    celulas: listarGrelha(operador, data, zona, tipo && eTipoIntervencao(tipo) ? tipo : undefined),
  };
});
