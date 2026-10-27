import { api } from "@/server/http";
import { exigirIntegracao } from "@/server/autorizacao";
import { filtrarLogsDespachante, listarAtividades, listarLogs, listarRetries } from "@/server/ofsc/loja";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";

export const GET = api(async (ator, pedido) => {
  exigirIntegracao(ator);
  const url = new URL(pedido.url);
  const depoisDe = url.searchParams.get("depoisDe") ?? undefined;
  const operadorPedido = url.searchParams.get("operador") ?? "azul";
  const despachante = ator.papel === "despachante" && Boolean(ator.operadorId);
  const operador = despachante ? ator.operadorId! : operadorPedido;
  const logsBrutos = despachante
    ? listarLogs(depoisDe, 120, { operadorId: ator.operadorId! })
    : listarLogs(depoisDe);
  const logs = despachante ? filtrarLogsDespachante(logsBrutos, ator.operadorId!) : logsBrutos;
  const retriesBrutos = listarRetries();
  const retries = despachante
    ? retriesBrutos.filter((r) => r.operador_id === ator.operadorId).map((r) => ({ id: r.id }))
    : retriesBrutos;
  return {
    logs,
    retries,
    atividades: eOperadorOfsc(operador) ? listarAtividades(operador) : [],
  };
});
