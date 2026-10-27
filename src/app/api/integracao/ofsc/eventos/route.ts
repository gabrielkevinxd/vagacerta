import { NextResponse } from "next/server";
import { traduzirMensagem } from "@/lib/i18n/motor";
import { eOperadorOfsc, type AtividadeOfsc, type EventoOfsc } from "@/lib/ofsc/tipos";
import { tipoDeCategoria } from "@/lib/ofsc/quotas";
import { apiIntegracao } from "@/server/http";
import { mensagensAtuais } from "@/server/idioma";
import { processarEventoOfsc } from "@/server/ofsc/recetor";

/** 400 DADOS_INVALIDOS com a frase no idioma do pedido. */
function invalido(frase: string) {
  return NextResponse.json({ codigo: "DADOS_INVALIDOS", mensagem: traduzirMensagem(mensagensAtuais(), frase) }, { status: 400 });
}

// Webhook OFSC → VagaCerta. Exige o segredo da integração ou uma sessão da central (ver `integracao-auth.ts`).
export const POST = apiIntegracao(async (pedido) => {
  const bruto = (await pedido.json().catch(() => null)) as Record<string, unknown> | null;
  if (!bruto || typeof bruto !== "object") return invalido("JSON em falta.");
  const operator = String(bruto.operator ?? bruto.operador ?? "");
  const eventType = String(bruto.eventType ?? bruto.type ?? "");
  const activity = (bruto.activity ?? bruto) as Record<string, unknown>;
  if (!eOperadorOfsc(operator) || (eventType !== "activityCreated" && eventType !== "activityUpdated")) {
    return invalido("eventType ou operator inválido.");
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
  if (!evento.activity.activityId || !evento.activity.date) return invalido("activityId e date são obrigatórios.");
  // Os erros do recetor (ErroHttp: 400/409…) saem com o seu código e estado; qualquer outro vira 500 ERRO_INTERNO.
  return processarEventoOfsc(evento);
});
