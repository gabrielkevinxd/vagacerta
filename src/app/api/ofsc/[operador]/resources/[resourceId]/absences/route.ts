import { NextResponse } from "next/server";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { apiIntegracao } from "@/server/http";
import { aplicarChamadaOfsc } from "@/server/ofsc/cliente";

type Contexto = { params: Promise<{ operador: string; resourceId: string }> };

// OFSC simulado: exige o segredo da integração ou uma sessão da central (ver `integracao-auth.ts`).
export const POST = apiIntegracao<Contexto>(async (pedido, contexto) => {
  const { operador, resourceId } = await contexto.params;
  if (!eOperadorOfsc(operador)) return NextResponse.json({ mensagem: "operador desconhecido" }, { status: 404 });
  const corpo = (await pedido.json().catch(() => ({}))) as Record<string, unknown>;
  const resultado = aplicarChamadaOfsc(operador, "POST", `/resources/${resourceId}/absences`, corpo);
  return NextResponse.json(resultado.corpo, { status: resultado.codigo });
});
