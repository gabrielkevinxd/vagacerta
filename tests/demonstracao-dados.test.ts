import { describe, expect, it } from "vitest";
import { criarMundoDemonstracao } from "@/lib/demonstracao";

// S1: o vídeo é público. Os dados de clientes da semente têm de ser obviamente fictícios.
describe("S1: dados de demonstração obviamente fictícios", () => {
  const ordens = criarMundoDemonstracao().ordens;

  it("a semente tem as 31 ordens de sempre", () => {
    expect(ordens).toHaveLength(31);
  });

  it("todos os telefones são 900 000 0xx e distintos", () => {
    for (const ordem of ordens) expect(ordem.clienteContacto, ordem.referencia).toMatch(/^900 000 0\d\d$/);
    expect(new Set(ordens.map((o) => o.clienteContacto)).size).toBe(ordens.length);
  });

  it("todas as moradas são «Rua Exemplo N, <cidade>», com a cidade da área da ordem", () => {
    ordens.forEach((ordem, indice) => {
      expect(ordem.morada, ordem.referencia).toBe(`Rua Exemplo ${indice + 1}, ${ordem.area}`);
    });
  });

  it("os nomes fictícios mantêm-se", () => {
    const nome = (ref: string) => ordens.find((o) => o.referencia === ref)?.clienteNome;
    expect(nome("AZ-24081")).toBe("Leonor Campos");
    expect(nome("VR-90001")).toBe("Duarte Pimentel");
    expect(nome("VD-URG")).toBe("Matilde Queirós");
  });
});
