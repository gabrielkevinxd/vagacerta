import { normalizarPedido, PEDIDO_OMISSAO } from "@/lib/gemeo";
import { esquemaGemeo } from "@/server/esquemas";
import { ErroHttp } from "@/server/erros";
import { exigirCentralGemeo, injetarLote } from "@/server/gemeo-injetar";
import { api, lerJson } from "@/server/http";
import { idiomaAtual } from "@/server/idioma";

export const POST = api(async (ator, pedido) => {
  exigirCentralGemeo(ator);
  const corpo = await lerJson(esquemaGemeo, pedido);
  const normal = normalizarPedido({ ...PEDIDO_OMISSAO, ...corpo, replicas: 1 });
  if ("mensagem" in normal) throw new ErroHttp(400, "DADOS_INVALIDOS", normal.mensagem);
  const { loteId, relatorio } = await injetarLote(normal);
  return { loteId, relatorio, idioma: idiomaAtual() };
});
