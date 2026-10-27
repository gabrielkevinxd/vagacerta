import { api } from "@/server/http";
import { listarAtividades, listarLogs, listarRetries } from "@/server/ofsc/loja";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";

export const GET = api(async (ator, pedido) => {
  const url = new URL(pedido.url);
  const depoisDe = url.searchParams.get("depoisDe") ?? undefined;
  const operadorPedido = url.searchParams.get("operador") ?? "azul";
  // Despachante: só o próprio operador; nunca vê OFSC dos outros (nomes/JSON).
  const operador =
    ator.papel === "despachante" && ator.operadorId ? ator.operadorId : operadorPedido;
  const logsBrutos = listarLogs(depoisDe) as {
    id: string;
    quando: string;
    coluna: string;
    historia: string;
    metodo: string | null;
    caminho: string | null;
    pedido: string | null;
    resposta: string | null;
    codigo: number | null;
  }[];
  const logs = ator.papel === "despachante" ? logsBrutos.filter((log) => log.coluna !== "outros") : logsBrutos;
  return {
    logs,
    retries: listarRetries(),
    atividades: eOperadorOfsc(operador) ? listarAtividades(operador) : [],
  };
});
