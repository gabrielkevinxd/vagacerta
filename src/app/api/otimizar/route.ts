import { mensagensDe } from "@/lib/i18n";
import { traduzirPlanoVista } from "@/lib/i18n/motor";
import { esquemaPedido } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { idiomaAtual } from "@/server/idioma";
import { previsualizar } from "@/server/servicos";

export const POST = api(async (ator, pedido) => {
  const corpo = await lerJson(esquemaPedido, pedido);
  return traduzirPlanoVista(mensagensDe(idiomaAtual()), previsualizar(ator, corpo));
});
