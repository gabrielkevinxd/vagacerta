import { esquemaFicha } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { atualizarOrdem, obterOrdem } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const GET = api<Contexto>(async (ator, _pedido, contexto) => {
  const { id } = await contexto.params;
  return obterOrdem(ator, id);
});

export const PATCH = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const corpo = await lerJson(esquemaFicha, pedido);
  return atualizarOrdem(ator, id, corpo);
});
