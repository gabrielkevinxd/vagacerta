import { eCentral } from "@/lib/rules";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { ErroHttp } from "@/server/erros";
import { api, lerJson } from "@/server/http";
import { definirOfscEmBaixo } from "@/server/ofsc/loja";
import { z } from "zod";

const esquema = z.object({
  operadorId: z.enum(["azul", "vermelho", "verde"]),
  emBaixo: z.boolean(),
});

export const POST = api(async (ator, pedido) => {
  if (!eCentral(ator)) {
    throw new ErroHttp(403, "SEM_PERMISSAO", "Só a central altera a saúde OFSC.");
  }
  const corpo = await lerJson(esquema, pedido);
  if (!eOperadorOfsc(corpo.operadorId)) throw new Error("operador");
  definirOfscEmBaixo(corpo.operadorId, corpo.emBaixo);
  return { ok: true, ...corpo };
});

