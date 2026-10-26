import { esquemaMargem } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { guardarMargem, margemAtual } from "@/server/servicos";

export const GET = api(async () => ({ margemDeslocacaoMin: margemAtual() }));

export const PUT = api(async (ator, pedido) => {
  const corpo = await lerJson(esquemaMargem, pedido);
  guardarMargem(ator, corpo.margemDeslocacaoMin);
  return { margemDeslocacaoMin: margemAtual() };
});
