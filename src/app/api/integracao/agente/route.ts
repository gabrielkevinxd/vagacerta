import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { interpretarComXai } from "@/lib/ofsc/xai";
import { traduzirDetalheAgente } from "@/lib/i18n/motor";
import { exigirIntegracao } from "@/server/autorizacao";
import { ErroHttp } from "@/server/erros";
import { hojeLisboa } from "@/lib/rules";
import { api, lerJson } from "@/server/http";
import { mensagensAtuais } from "@/server/idioma";
import { z } from "zod";

const esquema = z.object({
  operadorId: z.enum(["azul", "vermelho", "verde"]),
  texto: z.string().min(3).max(500),
});

export const POST = api(async (ator, pedido) => {
  exigirIntegracao(ator);
  const corpo = await lerJson(esquema, pedido);
  if (!eOperadorOfsc(corpo.operadorId)) throw new Error("operador");
  if (ator.papel === "despachante" && ator.operadorId !== corpo.operadorId) {
    throw new ErroHttp(403, "SEM_PERMISSAO", "Só vê a capacidade do seu operador.");
  }
  const interpretado = await interpretarComXai(corpo.texto, corpo.operadorId, fetch, hojeLisboa());
  // A nota do interpretador («Sem XAI_API_KEY: …») vem em PT; sai no idioma do pedido.
  return { ...interpretado, detalhe: traduzirDetalheAgente(mensagensAtuais(), interpretado.detalhe) };
});
