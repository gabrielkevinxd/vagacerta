import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { eTipoIntervencao } from "@/lib/ofsc/quotas";
import { api } from "@/server/http";
import { listarGrelha } from "@/server/ofsc/grelha";

export const GET = api(async (_ator, pedido) => {
  const url = new URL(pedido.url);
  const operador = url.searchParams.get("operador") ?? "azul";
  const data = url.searchParams.get("data") ?? "";
  const zona = url.searchParams.get("zona") ?? undefined;
  const tipo = url.searchParams.get("tipo") ?? undefined;
  if (!eOperadorOfsc(operador) || !data) return { celulas: [] };
  return {
    celulas: listarGrelha(operador, data, zona, tipo && eTipoIntervencao(tipo) ? tipo : undefined),
  };
});
