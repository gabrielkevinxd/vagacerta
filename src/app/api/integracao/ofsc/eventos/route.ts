import { NextResponse } from "next/server";
import { eOperadorOfsc, type AtividadeOfsc, type EventoOfsc } from "@/lib/ofsc/tipos";
import { tipoDeCategoria } from "@/lib/ofsc/quotas";
import { processarEventoOfsc } from "@/server/ofsc/recetor";

export async function POST(pedido: Request) {
  const bruto = (await pedido.json().catch(() => null)) as Record<string, unknown> | null;
  if (!bruto || typeof bruto !== "object") {
    return NextResponse.json({ codigo: "DADOS_INVALIDOS", mensagem: "JSON em falta." }, { status: 400 });
  }
  const operator = String(bruto.operator ?? bruto.operador ?? "");
  const eventType = String(bruto.eventType ?? bruto.type ?? "");
  const activity = (bruto.activity ?? bruto) as Record<string, unknown>;
  if (!eOperadorOfsc(operator) || (eventType !== "activityCreated" && eventType !== "activityUpdated")) {
    return NextResponse.json({ codigo: "DADOS_INVALIDOS", mensagem: "eventType ou operator inválido." }, { status: 400 });
  }
  const slot = (activity.timeSlot as { start?: string; end?: string } | undefined) ?? {};
  const tipoBruto = String(activity.tipoIntervencao ?? activity.activityType ?? "instalacao");
  const evento: EventoOfsc = {
    eventType,
    operator,
    activity: {
      activityId: String(activity.activityId ?? ""),
      resourceId: (activity.resourceId as string | null) ?? null,
      bucket: String(activity.bucket ?? "DST_TELECOM"),
      status: String(activity.status ?? "pending"),
      date: String(activity.date ?? ""),
      timeSlot: { start: String(slot.start ?? activity.start ?? ""), end: String(slot.end ?? activity.end ?? "") },
      workZone: String(activity.workZone ?? activity.zona ?? ""),
      apptNumber: String(activity.apptNumber ?? ""),
      tipoIntervencao: tipoDeCategoria(tipoBruto),
      technician: activity.technician ? String(activity.technician) : null,
      activityType: tipoDeCategoria(tipoBruto),
      technology: (activity.technology as AtividadeOfsc["technology"]) ?? null,
      customerName: String(activity.customerName ?? ""),
      customerPhone: String(activity.customerPhone ?? ""),
      streetAddress: String(activity.streetAddress ?? activity.address ?? ""),
      city: String(activity.city ?? ""),
      postalCode: String(activity.postalCode ?? ""),
      latitude: String(activity.latitude ?? ""),
      longitude: String(activity.longitude ?? ""),
      address: String(activity.address ?? activity.streetAddress ?? ""),
      note: String(activity.note ?? ""),
    },
  };
  if (!evento.activity.activityId || !evento.activity.date) {
    return NextResponse.json({ codigo: "DADOS_INVALIDOS", mensagem: "activityId e date são obrigatórios." }, { status: 400 });
  }
  try {
    const resultado = await processarEventoOfsc(evento);
    return NextResponse.json(resultado);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "falha";
    return NextResponse.json({ codigo: "ERRO_INTERNO", mensagem }, { status: 500 });
  }
}
