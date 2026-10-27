import type { PedidoAssistente } from "@/lib/contratos/assistente";
import { ErroHttp } from "@/server/erros";
import { esquemaAssistente } from "@/server/esquemas";
import { diaDoAssistente, painelAssistente, responderAssistente } from "@/server/assistente";
import { api, lerJson } from "@/server/http";

function exigirAssistente(ator: { papel: string }) {
  if (ator.papel === "tecnico") {
    throw new ErroHttp(403, "SEM_PERMISSAO", "Esta área não está disponível para o perfil de técnico.");
  }
}

export const GET = api(async (ator, pedido) => {
  exigirAssistente(ator);
  const data = new URL(pedido.url).searchParams.get("data") ?? undefined;
  return painelAssistente(ator, diaDoAssistente(data ?? undefined));
});

export const POST = api(async (ator, pedido) => {
  exigirAssistente(ator);
  const corpo = await lerJson(esquemaAssistente, pedido);
  return responderAssistente(ator, corpo as PedidoAssistente);
});
