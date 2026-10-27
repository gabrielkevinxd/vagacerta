import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { processarEventoOfsc } from "@/server/ofsc/recetor";
import { BUCKET_DST, type AtividadeOfsc, type EventoOfsc } from "@/lib/ofsc/tipos";
import { diaSemanaIso, somarDias } from "@/lib/rules";
import { baseDados } from "@/server/db";

let diaSeq = 0;
function diaTeste(): string {
  diaSeq += 1;
  let data = somarDias("2031-03-03", diaSeq * 7);
  while (diaSemanaIso(data) > 5) data = somarDias(data, 1);
  return data;
}

function atividade(parcial: Partial<AtividadeOfsc> = {}): AtividadeOfsc {
  return {
    activityId: `act-atual-${crypto.randomUUID()}`,
    resourceId: "AZ_RES_LITORAL",
    bucket: BUCKET_DST,
    status: "pending",
    date: diaTeste(),
    timeSlot: { start: "10:00", end: "12:00" },
    workZone: "zn-n04",
    apptNumber: `AZ-U${Math.random().toString(36).slice(2, 8)}`,
    tipoIntervencao: "instalacao",
    technician: "tec-helena",
    activityType: "instalacao",
    technology: null,
    city: "Aveiro",
    customerName: "Teste atualização",
    customerPhone: "000",
    streetAddress: "Rua A",
    postalCode: "3800-001",
    latitude: "40.6",
    longitude: "-8.6",
    address: "Rua A",
    note: "teste",
    ...parcial,
  };
}

function evento(tipo: EventoOfsc["eventType"], activity: AtividadeOfsc): EventoOfsc {
  return { eventType: tipo, operator: "azul", activity };
}

describe("recetor OFSC: activityUpdated", () => {
  beforeAll(() => {
    baseDados();
  });

  it("reagenda a ordem existente em vez de criar uma duplicada", async () => {
    const act = atividade();
    const criada = await processarEventoOfsc(evento("activityCreated", act));
    expect(criada.decisao).toBe("Reserva Confirmada");

    const novoDia = diaTeste();
    const atualizada = await processarEventoOfsc(
      evento("activityUpdated", { ...act, date: novoDia, timeSlot: { start: "13:00", end: "15:00" } }),
    );
    expect(atualizada.decisao).toBe("reagendada");
    expect(atualizada.ordemId).toBe(criada.ordemId);

    const ordem = baseDados().prepare("SELECT data, janela_inicio, estado FROM ordens WHERE id = ?").get(criada.ordemId!) as {
      data: string;
      janela_inicio: string;
      estado: string;
    };
    expect(ordem.data).toBe(novoDia);
    expect(ordem.janela_inicio).toBe("13:00");
    expect(ordem.estado).toBe("agendada");

    const ligacao = baseDados().prepare("SELECT ordem_id FROM ofsc_atividades WHERE activity_id = ?").get(act.activityId) as {
      ordem_id: string | null;
    };
    expect(ligacao.ordem_id).toBe(criada.ordemId);
  });

  it("cancela a ordem quando a atividade chega com status cancelled", async () => {
    const act = atividade();
    const criada = await processarEventoOfsc(evento("activityCreated", act));
    expect(criada.decisao).toBe("Reserva Confirmada");

    const cancelada = await processarEventoOfsc(evento("activityUpdated", { ...act, status: "cancelled" }));
    expect(cancelada.decisao).toBe("cancelada");

    const ordem = baseDados().prepare("SELECT estado FROM ordens WHERE id = ?").get(criada.ordemId!) as { estado: string };
    expect(ordem.estado).toBe("cancelada");
  });
});
