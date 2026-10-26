import { hojeLisboa } from "@/lib/rules";
import { api } from "@/server/http";
import { obterAgenda } from "@/server/servicos";

export const GET = api(async (ator, pedido) => {
  const url = new URL(pedido.url);
  const de = url.searchParams.get("de") || hojeLisboa();
  const ate = url.searchParams.get("ate") || de;
  return obterAgenda(ator, de, ate);
});
