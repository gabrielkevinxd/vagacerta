import { eOperadorOfsc, type ReservaEstruturada } from "@/lib/ofsc/tipos";
import { eTipoIntervencao } from "@/lib/ofsc/quotas";
import { api, lerJson } from "@/server/http";
import { ErroHttp } from "@/server/erros";
import { criarAtividadeNoBucket } from "@/server/ofsc/criar";
import { camposEmFalta } from "@/lib/ofsc/interpretador";
import { z } from "zod";

const esquema = z.object({
  operadorId: z.enum(["azul", "vermelho", "verde"]),
  zona: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  janelaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  janelaFim: z.string().regex(/^\d{2}:\d{2}$/),
  tipoIntervencao: z.enum(["instalacao", "manutencao", "adicional"]),
  resourceId: z.string().min(1),
  tecnicoId: z.string().nullable().optional(),
  apptNumber: z.string().min(1),
  customerName: z.string().optional().default(""),
  streetAddress: z.string().optional().default(""),
  city: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  latitude: z.string().optional().default(""),
  longitude: z.string().optional().default(""),
});

export const POST = api(async (ator, pedido) => {
  const corpo = await lerJson(esquema, pedido);
  if (ator.papel === "despachante") {
    if (!ator.operadorId || corpo.operadorId !== ator.operadorId) {
      throw new ErroHttp(403, "SEM_PERMISSAO", "Só vê a capacidade do seu operador.");
    }
  }
  if (!eOperadorOfsc(corpo.operadorId) || !eTipoIntervencao(corpo.tipoIntervencao)) {
    throw new ErroHttp(400, "DADOS_INVALIDOS", "Reserva incompleta.");
  }
  const reserva: ReservaEstruturada = {
    ...corpo,
    tecnicoId: corpo.tecnicoId ?? null,
    customerName: corpo.customerName,
    streetAddress: corpo.streetAddress,
    city: corpo.city,
    postalCode: corpo.postalCode,
    latitude: corpo.latitude,
    longitude: corpo.longitude,
  };
  const falta = camposEmFalta(reserva);
  if (falta.length) throw new ErroHttp(400, "DADOS_INVALIDOS", `Campos em falta: ${falta.join(", ")}.`);
  return criarAtividadeNoBucket(reserva);
});
