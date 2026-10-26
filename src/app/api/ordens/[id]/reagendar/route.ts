import { esquemaReagendar } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { reagendar } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const POST = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const corpo = await lerJson(esquemaReagendar, pedido);
  return reagendar(ator, id, corpo);
});
