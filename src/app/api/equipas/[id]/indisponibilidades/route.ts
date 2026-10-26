import { esquemaIndisponibilidade } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { adicionarIndisponibilidade, obterEquipa } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const POST = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const corpo = await lerJson(esquemaIndisponibilidade, pedido);
  adicionarIndisponibilidade(ator, id, corpo);
  return obterEquipa(ator, id, corpo.data);
});
