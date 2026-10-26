import { NextResponse } from "next/server";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { aplicarChamadaOfsc } from "@/server/ofsc/cliente";

type P = { params: Promise<{ operador: string; resourceId: string; id: string }> };

export async function PATCH(pedido: Request, contexto: P) {
  const { operador, resourceId, id } = await contexto.params;
  if (!eOperadorOfsc(operador)) return NextResponse.json({ mensagem: "operador desconhecido" }, { status: 404 });
  const corpo = (await pedido.json().catch(() => ({}))) as Record<string, unknown>;
  const resultado = aplicarChamadaOfsc(operador, "PATCH", `/resources/${resourceId}/absences/${id}`, corpo);
  return NextResponse.json(resultado.corpo, { status: resultado.codigo });
}

export async function DELETE(_pedido: Request, contexto: P) {
  const { operador, resourceId, id } = await contexto.params;
  if (!eOperadorOfsc(operador)) return NextResponse.json({ mensagem: "operador desconhecido" }, { status: 404 });
  const resultado = aplicarChamadaOfsc(operador, "DELETE", `/resources/${resourceId}/absences/${id}`, undefined);
  return NextResponse.json(resultado.corpo, { status: resultado.codigo });
}
