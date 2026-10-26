import { describe, expect, it } from "vitest";
import { atribuirPeriodo, vigenteEm } from "@/lib/rules/vigencia";

const hoje = "2026-10-26";

describe("vigência da zona da equipa", () => {
  it("troca no meio de um período aberto e preserva o passado", () => {
    const resultado = atribuirPeriodo(
      [{ id: "vig-1", chave: "zn-n01", inicio: "2026-01-01", fim: null }],
      { chave: "zn-n06", inicio: "2026-10-26", fim: "2026-11-01" },
      { hoje },
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(vigenteEm(resultado.periodos, "2026-10-25")?.chave).toBe("zn-n01");
    expect(vigenteEm(resultado.periodos, "2026-10-27")?.chave).toBe("zn-n06");
    expect(vigenteEm(resultado.periodos, "2026-11-02")?.chave).toBe("zn-n01");
  });

  it("junta a mesma zona em semanas seguidas", () => {
    const primeira = atribuirPeriodo([], { chave: "zn-n01", inicio: "2026-10-26", fim: "2026-11-01" }, { hoje });
    expect(primeira.ok).toBe(true);
    if (!primeira.ok) return;
    const segunda = atribuirPeriodo(
      primeira.periodos,
      { chave: "zn-n01", inicio: "2026-11-02", fim: "2026-11-08" },
      { hoje },
    );
    expect(segunda.ok).toBe(true);
    if (!segunda.ok) return;
    expect(segunda.periodos).toHaveLength(1);
    expect(segunda.periodos[0]).toMatchObject({ chave: "zn-n01", inicio: "2026-10-26", fim: "2026-11-08" });
  });

  it("não grava uma atribuição que já está coberta", () => {
    const base = [{ id: "vig-1", chave: "zn-n01", inicio: "2026-01-01", fim: null }];
    const resultado = atribuirPeriodo(base, { chave: "zn-n01", inicio: "2026-10-26", fim: "2026-11-01" }, { hoje });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.alterou).toBe(false);
    expect(resultado.periodos).toBe(base);
  });

  it("recusa corrigir o passado sem confirmação", () => {
    const recusa = atribuirPeriodo(
      [{ id: "vig-1", chave: "zn-n01", inicio: "2026-01-01", fim: null }],
      { chave: "zn-n02", inicio: "2026-10-01", fim: "2026-10-20" },
      { hoje },
    );
    expect(recusa.ok).toBe(false);
    if (recusa.ok) return;
    expect(recusa.codigo).toBe("PASSADO");
    const aceite = atribuirPeriodo(
      [{ id: "vig-1", chave: "zn-n01", inicio: "2026-01-01", fim: null }],
      { chave: "zn-n02", inicio: "2026-10-01", fim: "2026-10-20" },
      { hoje, confirmacao: true },
    );
    expect(aceite.ok).toBe(true);
  });
});
