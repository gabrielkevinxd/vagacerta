import { NextResponse } from "next/server";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { aplicarChamadaOfsc } from "@/server/ofsc/cliente";
import { respostaSeSegredoOfscInvalido } from "@/server/ofsc/segredo";

export async function POST(pedido: Request, contexto: { params: Promise<{ operador: string; resourceId: string }> }) {
  const negado = respostaSeSegredoOfscInvalido(pedido);
  if (negado) return negado;
  const { operador, resourceId } = await contexto.params;
  if (!eOperadorOfsc(operador)) return NextResponse.json({ mensagem: "operador desconhecido" }, { status: 404 });
  const corpo = (await pedido.json().catch(() => ({}))) as Record<string, unknown>;
  const resultado = aplicarChamadaOfsc(operador, "POST", `/resources/${resourceId}/absences`, corpo);
  return NextResponse.json(resultado.corpo, { status: resultado.codigo });
}
