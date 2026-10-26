import { esquemaEstado } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { mudarEstado } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const POST = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const corpo = await lerJson(esquemaEstado, pedido);
  return mudarEstado(ator, id, corpo.estado, corpo.motivo, corpo.quemPediu);
});
