import { api, lerJson } from "@/server/http";
import { correrCenario } from "@/server/ofsc/cenarios";
import { z } from "zod";

const esquema = z.object({ id: z.string().min(2).max(40) });

export const POST = api(async (_ator, pedido) => {
  const corpo = await lerJson(esquema, pedido);
  const resultado = await correrCenario(corpo.id);
  return { id: corpo.id, resultado };
});
