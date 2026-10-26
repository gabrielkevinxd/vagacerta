import { api } from "@/server/http";
import { desativarMembro, obterEquipa } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string; tecnicoId: string }> };

export const DELETE = api<Contexto>(async (ator, _pedido, contexto) => {
  const { id, tecnicoId } = await contexto.params;
  desativarMembro(ator, id, tecnicoId);
  return obterEquipa(ator, id);
});
