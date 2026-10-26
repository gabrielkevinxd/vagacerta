import { describe, expect, it } from "vitest";
import { cabeNaQuota, unidadesOcupadas, vagasRestantes, fraseContador } from "@/lib/ofsc/quotas";

describe("quotas OFSC", () => {
  it("3 instalações esgotam o dia (equivalentes a 8 manutenções)", () => {
    const ocupadas = unidadesOcupadas({ instalacao: 3, manutencao: 0, adicional: 0 });
    expect(ocupadas).toBeCloseTo(8);
    expect(vagasRestantes(ocupadas, "instalacao")).toBe(0);
    expect(vagasRestantes(ocupadas, "manutencao")).toBe(0);
    expect(cabeNaQuota(ocupadas, "instalacao")).toBe(false);
  });

  it("1 instalação deixa 2 instalações ou 5 manutenções", () => {
    const ocupadas = unidadesOcupadas({ instalacao: 1, manutencao: 0, adicional: 0 });
    expect(vagasRestantes(ocupadas, "instalacao")).toBe(2);
    expect(vagasRestantes(ocupadas, "manutencao")).toBe(5);
  });

  it("formata o contador N → N-1", () => {
    expect(fraseContador("Técnico 1", "2026-10-27", "instalacao", 1, 0)).toBe(
      "Técnico 1, 2026-10-27, instalações = 0 vagas (1 → 0)",
    );
  });
});
