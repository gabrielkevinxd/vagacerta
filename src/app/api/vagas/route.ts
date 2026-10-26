import { z } from "zod";
import { AREAS } from "@/lib/rules/areas";
import { CATEGORIAS, OPERADORES, TECNOLOGIAS } from "@/lib/rules";
import { ErroHttp } from "@/server/erros";
import { api } from "@/server/http";
import { obterVagas } from "@/server/servicos";

const esquema = z.object({
  operadorId: z.enum(OPERADORES),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  area: z.enum(AREAS),
  categoria: z.enum(CATEGORIAS),
  tecnologia: z.enum(TECNOLOGIAS).nullable(),
});

export const GET = api(async (ator, pedido) => {
  const url = new URL(pedido.url);
  const tecnologia = url.searchParams.get("tecnologia");
  const resultado = esquema.safeParse({
    operadorId: url.searchParams.get("operadorId"),
    data: url.searchParams.get("data"),
    area: url.searchParams.get("area"),
    categoria: url.searchParams.get("categoria"),
    tecnologia: tecnologia && tecnologia.length > 0 ? tecnologia : null,
  });
  if (!resultado.success) {
    throw new ErroHttp(400, "DADOS_INVALIDOS", "Indique operador, data, área e categoria para consultar vagas.");
  }
  return obterVagas(ator, resultado.data);
});
