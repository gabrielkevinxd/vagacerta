import { eCentral } from "@/lib/rules";
import { api, lerJson } from "@/server/http";
import { ErroHttp } from "@/server/erros";
import { correrCenario } from "@/server/ofsc/cenarios";
import { z } from "zod";

const esquema = z.object({ id: z.string().min(2).max(40) });

export const POST = api(async (ator, pedido) => {
  if (!eCentral(ator)) {
    throw new ErroHttp(403, "SEM_PERMISSAO", "Só a central corre cenários de integração.");
  }
  const corpo = await lerJson(esquema, pedido);
  const resultado = await correrCenario(corpo.id);
  return { id: corpo.id, resultado };
});
