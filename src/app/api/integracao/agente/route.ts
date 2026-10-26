import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { interpretarComXai } from "@/lib/ofsc/xai";
import { hojeLisboa } from "@/lib/rules";
import { api, lerJson } from "@/server/http";
import { z } from "zod";

const esquema = z.object({
  operadorId: z.enum(["azul", "vermelho", "verde"]),
  texto: z.string().min(3).max(500),
});

export const POST = api(async (_ator, pedido) => {
  const corpo = await lerJson(esquema, pedido);
  if (!eOperadorOfsc(corpo.operadorId)) throw new Error("operador");
  const interpretado = await interpretarComXai(corpo.texto, corpo.operadorId, fetch, hojeLisboa());
  return interpretado;
});
