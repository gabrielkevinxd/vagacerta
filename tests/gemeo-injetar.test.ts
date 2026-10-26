import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PEDIDO_OMISSAO } from "@/lib/gemeo/pedido";
import { baseDados } from "@/server/db";
import { apagarLote, injetarLote, relatorioDoLote, totaisDoLote } from "@/server/gemeo-injetar";

describe("injeção do gémeo na base", () => {
  beforeAll(() => {
    baseDados();
  });

  it("os totais do gémeo coincidem com as ordens do lote na base", async () => {
    const { loteId, relatorio } = await injetarLote({
      ...PEDIDO_OMISSAO,
      replicas: 1,
      semanas: 1,
      procura: 0.5,
      probabilidadeFalta: 0,
    });
    const totais = totaisDoLote(loteId);
    const partilhada = relatorio.politicas.find((linha) => linha.id === "partilhada")!;
    expect(partilhada.aceites).toBe(totais.aceites);
    expect(totais.ordens).toBe(totais.aceites + totais.espera);
    expect(relatorio.ordensGeradas).toBe(partilhada.aceites + partilhada.recusadas);
    const naBase = baseDados()
      .prepare(`SELECT COUNT(*) AS n FROM ordens WHERE lote_id = ? AND estado IN ('agendada','em_curso','concluida')`)
      .get(loteId) as { n: number };
    expect(Number(naBase.n)).toBe(partilhada.aceites);
    const segundo = relatorioDoLote(loteId);
    expect(segundo.politicas[0]?.aceites).toBe(totais.aceites);
    apagarLote(loteId);
    const depois = baseDados().prepare("SELECT COUNT(*) AS n FROM ordens WHERE lote_id = ?").get(loteId) as { n: number };
    expect(Number(depois.n)).toBe(0);
  }, 120_000);
});
