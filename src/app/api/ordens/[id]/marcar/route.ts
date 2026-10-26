import { esquemaMarcar } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { marcarJa } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const POST = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const corpo = await lerJson(esquemaMarcar, pedido);
  return marcarJa(ator, id, corpo.equipaId);
});
