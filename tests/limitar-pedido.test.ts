import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Ator } from "@/lib/rules";
import { baseDados, lerMundo } from "@/server/db";
import { ErroHttp } from "@/server/erros";
import { previsualizar } from "@/server/servicos";

const admin: Ator = {
  id: "usr-admin",
  nome: "Teresa Varela",
  papel: "administrador",
  operadorId: null,
  tecnicoId: null,
  equipaId: null,
};

const despachanteAzul: Ator = {
  id: "usr-azul",
  nome: "Clara Monteiro",
  papel: "despachante",
  operadorId: "azul",
  tecnicoId: null,
  equipaId: null,
};

const despachanteVermelho: Ator = {
  id: "usr-vermelho",
  nome: "Gonçalo Pires",
  papel: "despachante",
  operadorId: "vermelho",
  tecnicoId: null,
  equipaId: null,
};

const despachanteVerde: Ator = {
  id: "usr-verde",
  nome: "Beatriz Lamego",
  papel: "despachante",
  operadorId: "verde",
  tecnicoId: null,
  equipaId: null,
};

const tecnico: Ator = {
  id: "usr-tecnico",
  nome: "Rui Salgado",
  papel: "tecnico",
  operadorId: null,
  tecnicoId: "tec-rui",
  equipaId: "eq-minho",
};

function falha(trabalho: () => unknown): ErroHttp {
  try {
    trabalho();
  } catch (erro) {
    if (erro instanceof ErroHttp) return erro;
    throw erro;
  }
  throw new Error("Esperava-se um ErroHttp, mas a operação teve sucesso.");
}

/**
 * Cobertura de `limitarPedido` (API de reencaixe do despachante).
 * Se a função for reduzida a `return pedido`, estes casos falham:
 * o despachante deixaria de ser barrado e poderia mover ordens alheias.
 */
describe("limitarPedido — limite do pedido de reencaixe na API", () => {
  beforeAll(() => {
    baseDados();
  });

  it("o técnico não reorganiza o dia (403)", () => {
    const erro = falha(() => previsualizar(tecnico, { data: "2026-10-27" }));
    expect(erro.status).toBe(403);
    expect(erro.codigo).toBe("SEM_PERMISSAO");
    expect(erro.message).toMatch(/técnico/i);
  });

  it("só a central regista a falta de uma equipa (403 ao despachante)", () => {
    const erro = falha(() =>
      previsualizar(despachanteAzul, { equipaEmFalta: "eq-minho", data: "2026-10-27" }),
    );
    expect(erro.status).toBe(403);
    expect(erro.codigo).toBe("SEM_PERMISSAO");
    expect(erro.message).toMatch(/central/i);
  });

  it("o despachante não cancela nem encaixa ordens de outro operador (404)", () => {
    const cancelar = falha(() =>
      previsualizar(despachanteAzul, { cancelarId: "ord-vr-90001", permitirTroca: true }),
    );
    expect(cancelar.status).toBe(404);
    expect(cancelar.codigo).toBe("NAO_ENCONTRADO");

    const encaixar = falha(() =>
      previsualizar(despachanteAzul, { encaixarId: "ord-vd-urg", permitirTroca: true }),
    );
    expect(encaixar.status).toBe(404);
    expect(encaixar.codigo).toBe("NAO_ENCONTRADO");
  });

  it("força apenasDoOperador e desliga a troca: cancelar VR não encaixa a VD-URG alheia", () => {
    // Sem limitarPedido (return pedido + permitirTroca), a VD-URG entraria na Minho.
    const vista = previsualizar(despachanteVermelho, {
      cancelarId: "ord-vr-90001",
      permitirTroca: true,
    });
    expect(vista.viavel).toBe(true);
    expect(vista.movimentos.some((m) => m.tipo === "cancelar" && m.referencia === "VR-90001")).toBe(true);
    expect(vista.movimentos.every((m) => m.referencia.startsWith("VR"))).toBe(true);
    expect(vista.movimentos.some((m) => m.referencia === "Outro operador")).toBe(false);
    expect(JSON.stringify(vista)).not.toContain("VD-URG");

    // Contraste: a central, sem limite, encaixa a urgente verde.
    const central = previsualizar(admin, {
      cancelarId: "ord-vr-90001",
      permitirTroca: true,
    });
    expect(central.viavel).toBe(true);
    expect(central.movimentos.some((m) => m.referencia === "VD-URG" && m.tipo === "encaixar")).toBe(true);
  });

  it("o despachante verde encaixa a própria urgente sem pedir troca nem tocar no vermelho", () => {
    const vista = previsualizar(despachanteVerde, {
      encaixarId: "ord-vd-urg",
      permitirTroca: true,
    });
    expect(vista.viavel).toBe(true);
    expect(vista.movimentos.every((m) => m.referencia.startsWith("VD"))).toBe(true);
    expect(vista.movimentos.some((m) => m.referencia === "Outro operador")).toBe(false);
    expect(JSON.stringify(vista)).not.toMatch(/VR-90001/);
  });

  it("a pré-visualização limitada não altera o mundo", () => {
    const antes = lerMundo();
    previsualizar(despachanteVermelho, { cancelarId: "ord-vr-90001", permitirTroca: true });
    const depois = lerMundo();
    expect(depois.ordens.find((o) => o.id === "ord-vr-90001")?.estado).toBe("agendada");
    expect(depois.ordens.find((o) => o.id === "ord-vd-urg")?.estado).toBe("em_espera");
    expect(depois.ordens.length).toBe(antes.ordens.length);
  });
});
