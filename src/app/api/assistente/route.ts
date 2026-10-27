import type { PedidoAssistente } from "@/lib/contratos/assistente";
import { esquemaAssistente } from "@/server/esquemas";
import { diaDoAssistente, painelAssistente, responderAssistente } from "@/server/assistente";
import { api, lerJson } from "@/server/http";

export const GET = api(async (ator, pedido) => {
  const data = new URL(pedido.url).searchParams.get("data") ?? undefined;
  return painelAssistente(ator, diaDoAssistente(data ?? undefined));
});

export const POST = api(async (ator, pedido) => {
  const corpo = await lerJson(esquemaAssistente, pedido);
  return responderAssistente(ator, corpo as PedidoAssistente);
});
