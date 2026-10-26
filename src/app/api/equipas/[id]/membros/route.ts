import { esquemaMembro } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { adicionarMembro, obterEquipa } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const POST = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const corpo = await lerJson(esquemaMembro, pedido);
  adicionarMembro(ator, id, corpo.nome);
  return obterEquipa(ator, id);
});
