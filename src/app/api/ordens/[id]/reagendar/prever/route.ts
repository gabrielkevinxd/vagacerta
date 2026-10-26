import { mensagensDe } from "@/lib/i18n";
import { traduzirNarrativa } from "@/lib/i18n/motor";
import { esquemaReagendar } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { idiomaAtual } from "@/server/idioma";
import { preverReagendamento } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const POST = api<Contexto>(async (ator, pedido, contexto) => {
  const { id } = await contexto.params;
  const corpo = await lerJson(esquemaReagendar, pedido);
  const previsao = preverReagendamento(ator, id, corpo);
  return { ...previsao, mensagem: traduzirNarrativa(mensagensDe(idiomaAtual()), previsao.mensagem) };
});
