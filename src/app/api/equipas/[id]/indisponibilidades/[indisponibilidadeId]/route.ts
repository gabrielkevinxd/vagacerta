import { api } from "@/server/http";
import { obterEquipa, removerIndisponibilidade } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string; indisponibilidadeId: string }> };

export const DELETE = api<Contexto>(async (ator, _pedido, contexto) => {
  const { id, indisponibilidadeId } = await contexto.params;
  removerIndisponibilidade(ator, id, indisponibilidadeId);
  return obterEquipa(ator, id);
});
