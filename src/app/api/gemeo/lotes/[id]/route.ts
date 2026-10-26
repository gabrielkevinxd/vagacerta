import { apagarLote, exigirCentralGemeo, relatorioDoLote } from "@/server/gemeo-injetar";
import { api } from "@/server/http";
import { idiomaAtual } from "@/server/idioma";

type Contexto = { params: Promise<{ id: string }> };

export const GET = api<Contexto>(async (ator, _pedido, contexto) => {
  exigirCentralGemeo(ator);
  const { id } = await contexto.params;
  return relatorioDoLote(id, idiomaAtual());
});

export const DELETE = api<Contexto>(async (ator, _pedido, contexto) => {
  exigirCentralGemeo(ator);
  const { id } = await contexto.params;
  apagarLote(id);
  return { ok: true, loteId: id };
});
