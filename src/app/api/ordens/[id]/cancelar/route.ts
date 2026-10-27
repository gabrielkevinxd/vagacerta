import { z } from "zod";
import { QUEM_PEDIU } from "@/lib/rules";
import { ErroHttp } from "@/server/erros";
import { api, lerJson } from "@/server/http";
import { mudarEstado } from "@/server/servicos";

const esquema = z.object({
  motivo: z.string().trim().min(3, "Indique o motivo do cancelamento.").max(240),
  quemPediu: z.enum(QUEM_PEDIU),
});

type Contexto = { params: Promise<{ id: string }> };

export const POST = api<Contexto>(async (ator, pedido, contexto) => {
  if (ator.papel === "tecnico") {
    throw new ErroHttp(403, "SEM_PERMISSAO", "O técnico não cancela ordens.");
  }
  const { id } = await contexto.params;
  const corpo = await lerJson(esquema, pedido);
  if (!corpo.motivo.trim()) throw new ErroHttp(400, "DADOS_INVALIDOS", "Cancelar exige um motivo.");
  return mudarEstado(ator, id, "cancelada", corpo.motivo, corpo.quemPediu);
});
