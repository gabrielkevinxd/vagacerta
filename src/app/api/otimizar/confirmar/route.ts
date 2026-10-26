import { mensagensDe } from "@/lib/i18n";
import { traduzirPlanoVista } from "@/lib/i18n/motor";
import { esquemaConfirmar } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { idiomaAtual } from "@/server/idioma";
import { confirmarPlano } from "@/server/servicos";

export const POST = api(async (ator, pedido) => {
  const corpo = await lerJson(esquemaConfirmar, pedido);
  return traduzirPlanoVista(mensagensDe(idiomaAtual()), confirmarPlano(ator, corpo.pedido, corpo.selo));
});
