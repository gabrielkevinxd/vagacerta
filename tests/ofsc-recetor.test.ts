import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { processarEventoOfsc } from "@/server/ofsc/recetor";
import { avaliarReserva } from "@/server/ofsc/grelha";
import { BUCKET_DST, type AtividadeOfsc, type EventoOfsc } from "@/lib/ofsc/tipos";
import { diaSemanaIso, somarDias } from "@/lib/rules";
import { baseDados } from "@/server/db";

let diaSeq = 0;
function diaTeste(): string {
  diaSeq += 1;
  let data = somarDias("2029-03-05", diaSeq * 7);
  while (diaSemanaIso(data) > 5) data = somarDias(data, 1);
  return data;
}

function atividade(parcial: Partial<AtividadeOfsc> = {}): AtividadeOfsc {
  return {
    activityId: `act-test-${crypto.randomUUID()}`,
    resourceId: "AZ_RES_LITORAL",
    bucket: BUCKET_DST,
    status: "pending",
    date: diaTeste(),
    timeSlot: { start: "10:00", end: "12:00" },
    workZone: "0105",
    apptNumber: `AZ-T${Math.random().toString(36).slice(2, 8)}`,
    tipoIntervencao: "instalacao",
    technician: "tec-helena",
    activityType: "instalacao",
    technology: null,
    city: "Aveiro",
    customerName: "Teste",
    customerPhone: "000",
    streetAddress: "Rua A",
    postalCode: "4700-024",
    latitude: "41.5",
    longitude: "-8.4",
    address: "Rua A",
    note: "teste",
    ...parcial,
  };
}

function evento(activity: AtividadeOfsc, operator: EventoOfsc["operator"] = "azul"): EventoOfsc {
  return { eventType: "activityCreated", operator, activity };
}

describe("recetor OFSC", () => {
  beforeAll(() => {
    baseDados();
  });

  it("é idempotente no mesmo activityId e assinatura", async () => {
    const act = atividade({ customerName: "Idem" });
    const primeiro = await processarEventoOfsc(evento(act));
    const segundo = await processarEventoOfsc(evento(act));
    expect(primeiro.duplicado).toBe(false);
    expect(segundo.duplicado).toBe(true);
    expect(primeiro.decisao).toBe("Reserva Confirmada");
  });

  it("serializa dois operadores no mesmo dia em recursos distintos", async () => {
    const data = diaTeste();
    const azul = atividade({ date: data });
    const vermelho = atividade({
      date: data,
      customerName: "Vermelho concorrente",
      timeSlot: { start: "09:00", end: "12:00" },
      workZone: "0308",
      city: "Guimarães",
      resourceId: "VR_RES_AVE",
      technician: "tec-joao",
      apptNumber: `VR-PAR-${crypto.randomUUID().slice(0, 8)}`,
    });
    const [a, b] = await Promise.all([
      processarEventoOfsc(evento(azul, "azul")),
      processarEventoOfsc(evento(vermelho, "vermelho")),
    ]);
    expect(a.duplicado).toBe(false);
    expect(b.duplicado).toBe(false);
    expect(a.ordemId).not.toBe(b.ordemId);
  });

  it("confirma a reserva, faz PATCH do resourceId e cria ausências com contador", async () => {
    const act = atividade({ customerName: "Vaga livre teste" });
    const resultado = await processarEventoOfsc(evento(act));
    expect(resultado.decisao).toBe("Reserva Confirmada");
    expect(resultado.equipaId).toBeTruthy();
    const ausencias = baseDados()
      .prepare("SELECT COUNT(*) AS n FROM ofsc_ausencias WHERE activity_id = ?")
      .get(act.activityId) as { n: number };
    expect(ausencias.n).toBeGreaterThanOrEqual(1);
    const patch = baseDados()
      .prepare("SELECT resource_id FROM ofsc_atividades WHERE activity_id = ?")
      .get(act.activityId) as { resource_id: string | null };
    expect(patch.resource_id).toBe("AZ_RES_LITORAL");
  });

  it("recusa zona fechada", () => {
    const avaliacao = avaliarReserva({
      operadorId: "azul",
      zona: "zn-nao-existe",
      data: "2026-11-03",
      janelaInicio: "10:00",
      janelaFim: "12:00",
      tipoIntervencao: "instalacao",
      resourceId: "AZ_RES_MINHO",
    });
    expect(avaliacao.ok).toBe(false);
    expect(avaliacao.motivo).toBe("Zona Fechada");
  });

  it("recusa fora da janela", async () => {
    const act = atividade({
      date: diaTeste(),
      timeSlot: { start: "03:00", end: "04:00" },
      apptNumber: `AZ-FORA-${crypto.randomUUID().slice(0, 8)}`,
    });
    const resultado = await processarEventoOfsc(evento(act));
    expect(resultado.decisao).toBe("Reserva Recusada");
    expect(resultado.motivo).toBe("Fora da janela");
  });
});
