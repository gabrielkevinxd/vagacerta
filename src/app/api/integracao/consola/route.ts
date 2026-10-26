import { api } from "@/server/http";
import { listarAtividades, listarLogs, listarRetries } from "@/server/ofsc/loja";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";

export const GET = api(async (_ator, pedido) => {
  const url = new URL(pedido.url);
  const depoisDe = url.searchParams.get("depoisDe") ?? undefined;
  const operador = url.searchParams.get("operador") ?? "azul";
  return {
    logs: listarLogs(depoisDe),
    retries: listarRetries(),
    atividades: eOperadorOfsc(operador) ? listarAtividades(operador) : [],
  };
});
