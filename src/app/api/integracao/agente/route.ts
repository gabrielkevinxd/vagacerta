import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { interpretarComXai } from "@/lib/ofsc/xai";
import { exigirIntegracao } from "@/server/autorizacao";
import { ErroHttp } from "@/server/erros";
import { hojeLisboa } from "@/lib/rules";
import { api, lerJson } from "@/server/http";
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
  return interpretado;
});

