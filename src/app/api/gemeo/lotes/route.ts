import { exigirCentralGemeo, listarLotes } from "@/server/gemeo-injetar";
import { api } from "@/server/http";

export const GET = api(async (ator) => {
  exigirCentralGemeo(ator);
  return { lotes: listarLotes() };
});
