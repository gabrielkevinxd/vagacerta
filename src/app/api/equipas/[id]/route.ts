import { esquemaEquipa } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { guardarEquipa, obterEquipa } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const GET = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const data = new URL(pedido.url).searchParams.get("data") || undefined;
  return obterEquipa(ator, id, data);
});

export const PATCH = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const corpo = await lerJson(esquemaEquipa, pedido);
  guardarEquipa(ator, id, corpo);
  return obterEquipa(ator, id);
});
