import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { criarMundoDemonstracao } from "@/lib/demonstracao";
import { diaDemonstracao, diaUtilAnterior, diaUtilSeguinte, proximoDiaUtil, somarDiasUteis } from "@/lib/demonstracao-dia";
import { correrSimulacao, FROTA_GEMEO, PEDIDO_OMISSAO } from "@/lib/gemeo";
import { diaSemanaIso } from "@/lib/rules";
import { reencaixar } from "@/lib/rules/reencaixe";

function planoDaHistoria(dia: string) {
  const mundo = criarMundoDemonstracao(dia);
  const urgente = mundo.ordens.find((linha) => linha.referencia === "VD-URG")!;
  return reencaixar(mundo, { encaixarId: urgente.id, permitirTroca: true });
}

describe("B8: o dia rico é relativo a «hoje» (Europe/Lisbon), com override VC_DEMO_DIA", () => {
  it("em dia útil, o dia rico é o próprio dia", () => {
    expect(diaDemonstracao(new Date("2026-10-27T10:00:00Z"), "")).toBe("2026-10-27");
    expect(diaDemonstracao(new Date("2027-03-15T09:00:00Z"), "")).toBe("2027-03-15");
    expect(diaDemonstracao(new Date("2027-03-19T09:00:00Z"), "")).toBe("2027-03-19");
  });

  it("num fim de semana, o dia rico é o próximo dia útil (segunda-feira)", () => {
    expect(diaDemonstracao(new Date("2026-10-31T12:00:00Z"), "")).toBe("2026-11-02");
    expect(diaDemonstracao(new Date("2026-11-01T12:00:00Z"), "")).toBe("2026-11-02");
  });

  it("conta o dia de Lisboa, não o de UTC", () => {
    // Verão: Lisboa = UTC+1. Segunda 23:30 UTC já é terça em Lisboa; sexta 23:30 UTC já é sábado (→ segunda).
    expect(diaDemonstracao(new Date("2026-07-06T23:30:00Z"), "")).toBe("2026-07-07");
    expect(diaDemonstracao(new Date("2026-07-10T23:30:00Z"), "")).toBe("2026-07-13");
  });

  it("VC_DEMO_DIA fixa o dia (e avança do mesmo modo se cair num fim de semana)", () => {
    const agora = new Date("2026-12-01T10:00:00Z");
    expect(diaDemonstracao(agora, "2027-03-17")).toBe("2027-03-17");
    expect(diaDemonstracao(agora, " 2027-03-17 ")).toBe("2027-03-17");
    expect(diaDemonstracao(agora, "2027-03-20")).toBe("2027-03-22");
  });

  it("sem o segundo argumento lê VC_DEMO_DIA do ambiente (fixo em 2026-10-27 nos testes)", () => {
    expect(process.env.VC_DEMO_DIA).toBe("2026-10-27");
    expect(diaDemonstracao(new Date("2031-05-14T10:00:00Z"))).toBe("2026-10-27");
    expect(diaDemonstracao()).toBe("2026-10-27");
  });

  it("um VC_DEMO_DIA inválido é ignorado", () => {
    const agora = new Date("2026-12-02T10:00:00Z");
    expect(diaDemonstracao(agora, "2027-02-30")).toBe("2026-12-02");
    expect(diaDemonstracao(agora, "amanhã")).toBe("2026-12-02");
    expect(diaDemonstracao(agora, "")).toBe("2026-12-02");
  });

  it("calcula dias úteis à volta de uma data", () => {
    expect(proximoDiaUtil("2027-03-20")).toBe("2027-03-22");
    expect(proximoDiaUtil("2027-03-17")).toBe("2027-03-17");
    expect(diaUtilAnterior("2027-03-15")).toBe("2027-03-12");
    expect(diaUtilSeguinte("2027-03-19")).toBe("2027-03-22");
    expect(somarDiasUteis("2026-10-27", 5)).toBe("2026-11-03");
    expect(somarDiasUteis("2026-10-27", 13)).toBe("2026-11-13");
    expect(somarDiasUteis("2027-03-19", 1)).toBe("2027-03-22");
    expect(somarDiasUteis("2027-03-22", -1)).toBe("2027-03-19");
  });
});

describe("B8: a história-estrela é idêntica em qualquer dia, só com as datas deslocadas", () => {
  const dias = ["2027-03-15", "2027-03-16", "2027-03-17", "2027-03-18", "2027-03-19", "2026-12-31", "2028-02-29"];

  for (const dia of dias) {
    it(`dia rico ${dia} (${["", "segunda", "terça", "quarta", "quinta", "sexta"][diaSemanaIso(dia)]})`, () => {
      const mundo = criarMundoDemonstracao(dia);
      const ordem = (referencia: string) => mundo.ordens.find((linha) => linha.referencia === referencia)!;

      // As três ordens da história estão no dia rico, na equipa certa.
      expect(ordem("VD-URG")).toMatchObject({ data: dia, estado: "em_espera", equipaId: null });
      expect(ordem("AZ-24081")).toMatchObject({ data: dia, estado: "agendada", equipaId: "eq-minho" });
      expect(ordem("VR-90001")).toMatchObject({ data: dia, estado: "agendada", equipaId: "eq-minho" });

      // Sem troca de equipa a ordem urgente não cabe; com uma troca cabe, e o plano é o mesmo de sempre.
      expect(reencaixar(mundo, { encaixarId: ordem("VD-URG").id, permitirTroca: false }).viavel).toBe(false);
      const plano = reencaixar(mundo, { encaixarId: ordem("VD-URG").id, permitirTroca: true });
      expect(plano.viavel).toBe(true);
      expect(plano.mensagem).toBe(planoDaHistoria("2026-10-27").mensagem);
      for (const parte of ["VR-90001", "Equipa Ave", "VD-URG", "08:00", "AZ-24081", "10:25"]) expect(plano.mensagem).toContain(parte);
      expect(
        plano.movimentos.some((m) => m.tipo === "reagendar" && m.referencia === "VR-90001" && m.paraEquipaId === "eq-ave"),
      ).toBe(true);

      // O dia anterior e o seguinte são dias úteis; a formação da Equipa Cávado cai no dia rico.
      const datas = new Set(mundo.ordens.map((linha) => linha.data));
      expect([...datas].sort()).toEqual([diaUtilAnterior(dia), dia, diaUtilSeguinte(dia)].sort());
      for (const data of datas) expect(diaSemanaIso(data)).toBeLessThanOrEqual(5);
      const cavado = mundo.equipas.find((equipa) => equipa.id === "eq-cavado")!;
      expect(cavado.indisponibilidades).toMatchObject([{ data: dia, inicio: "12:00", fim: "14:00" }]);

      // Em curso e concluída continuam a ser as de «ontem».
      expect(ordem("AZ-26005").estado).toBe("em_curso");
      expect(ordem("VD-26004").estado).toBe("concluida");
    });
  }

  it("com o dia rico fixo em 2026-10-27 (como nos testes) mantém as datas de sempre", () => {
    const mundo = criarMundoDemonstracao("2026-10-27");
    const datas = [...new Set(mundo.ordens.map((linha) => linha.data))].sort();
    expect(datas).toEqual(["2026-10-26", "2026-10-27", "2026-10-28"]);
    expect(criarMundoDemonstracao().ordens.map((o) => o.data)).toEqual(mundo.ordens.map((o) => o.data));
  });

  it("o gémeo digital dá os mesmos números em qualquer semana (só muda o calendário da série diária)", () => {
    const base = correrSimulacao(PEDIDO_OMISSAO, "pt-PT", FROTA_GEMEO, "2026-10-26");
    const outra = correrSimulacao(PEDIDO_OMISSAO, "pt-PT", FROTA_GEMEO, "2027-03-15");
    expect(outra.politicas).toEqual(base.politicas);
    expect(outra.ordensGeradas).toBe(base.ordensGeradas);
    expect(base.serieDiaria.map((linha) => linha.data)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]);
    expect(outra.serieDiaria.map((linha) => linha.data)).toEqual(["2027-03-15", "2027-03-16", "2027-03-17", "2027-03-18", "2027-03-19"]);
  });
});

describe("B8: a base semeada usa o dia rico de VC_DEMO_DIA e guarda-o", () => {
  const pasta = mkdtempSync(path.join(tmpdir(), "vagacerta-demo-dia-"));
  const guardado = {
    base: (globalThis as { __vcDb?: unknown }).__vcDb,
    pasta: process.env.VC_DATA_DIR,
    dia: process.env.VC_DEMO_DIA,
  };

  afterAll(() => {
    const global = globalThis as { __vcDb?: { close(): void } | undefined };
    try {
      global.__vcDb?.close();
    } catch {
      /* já fechada */
    }
    global.__vcDb = guardado.base as typeof global.__vcDb;
    if (guardado.pasta === undefined) delete process.env.VC_DATA_DIR;
    else process.env.VC_DATA_DIR = guardado.pasta;
    if (guardado.dia === undefined) delete process.env.VC_DEMO_DIA;
    else process.env.VC_DEMO_DIA = guardado.dia;
    vi.resetModules();
    try {
      rmSync(pasta, { recursive: true, force: true });
    } catch {
      /* o sistema limpa a pasta temporária mais tarde */
    }
  });

  it("semeia as ordens à volta de VC_DEMO_DIA e devolve esse dia como dia rico", async () => {
    (globalThis as { __vcDb?: unknown }).__vcDb = undefined;
    process.env.VC_DATA_DIR = pasta;
    process.env.VC_DEMO_DIA = "2027-03-17";
    vi.resetModules();
    const { baseDados, diaDemonstracaoAtual } = await import("@/server/db");
    const db = baseDados();
    const urgente = db.prepare("SELECT data, estado FROM ordens WHERE referencia = 'VD-URG'").get() as { data: string; estado: string };
    expect(urgente).toEqual({ data: "2027-03-17", estado: "em_espera" });
    const datas = (db.prepare("SELECT DISTINCT data FROM ordens ORDER BY data").all() as { data: string }[]).map((linha) => linha.data);
    expect(datas).toEqual(["2027-03-16", "2027-03-17", "2027-03-18"]);
    expect(diaDemonstracaoAtual()).toBe("2027-03-17");
    // O dia fica guardado na base: mudar a variável depois não desloca a história já semeada.
    process.env.VC_DEMO_DIA = "2030-01-02";
    expect(diaDemonstracaoAtual()).toBe("2027-03-17");
    const indisponibilidade = db.prepare("SELECT data FROM indisponibilidades WHERE id = 'un-cavado-formacao'").get() as { data: string };
    expect(indisponibilidade.data).toBe("2027-03-17");
    const criada = db.prepare("SELECT MIN(criada_em) AS quando FROM ordens").get() as { quando: string };
    expect(criada.quando.startsWith("2027-03-16")).toBe(true);
  });
});
