import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rules/reencaixe", async (orig) => {
  const real = await orig<typeof import("@/lib/rules/reencaixe")>();
  return { ...real, reencaixar: vi.fn(real.reencaixar) };
});

import type { Ator } from "@/lib/rules";
import { reencaixar } from "@/lib/rules/reencaixe";
import { baseDados } from "@/server/db";
import { ErroHttp } from "@/server/erros";
import { confirmarPlano, previsualizar } from "@/server/servicos";

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

function pedidoEntregueAoMotor() {
  expect(vi.mocked(reencaixar).mock.calls.length).toBeGreaterThanOrEqual(1);
  return vi.mocked(reencaixar).mock.calls[0]![1];
}

/**
 * Cobertura de `limitarPedido` (API de reencaixe do despachante).
 * Espia `reencaixar` para afirmar o pedido limitado exacto (incl. permitirTroca: false)
 * em previsualizar e confirmarPlano — mata M2/M11 da revisão X1.
 */
describe("limitarPedido — limite do pedido de reencaixe na API", () => {
  const pasta = mkdtempSync(path.join(tmpdir(), "vagacerta-limitar-pedido-"));
  const guardado = {
    base: undefined as unknown,
    pasta: undefined as string | undefined,
  };

  beforeAll(() => {
    const global = globalThis as { __vcDb?: unknown };
    guardado.base = global.__vcDb;
    guardado.pasta = process.env.VC_DATA_DIR;
    global.__vcDb = undefined;
    process.env.VC_DATA_DIR = pasta;
    baseDados();
  });

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
    try {
      rmSync(pasta, { recursive: true, force: true });
    } catch {
      /* tmp */
    }
  });

  it("o técnico não reorganiza o dia (403)", () => {
    const erro = falha(() => previsualizar(tecnico, { data: "2026-10-27" }));
    expect(erro.status).toBe(403);
    expect(erro.codigo).toBe("SEM_PERMISSAO");
    expect(erro.message).toBe("O técnico não reorganiza o dia.");
  });

  it("só a central regista a falta de uma equipa (403 ao despachante)", () => {
    const erro = falha(() =>
      previsualizar(despachanteAzul, { equipaEmFalta: "eq-minho", data: "2026-10-27" }),
    );
    expect(erro.status).toBe(403);
    expect(erro.codigo).toBe("SEM_PERMISSAO");
    expect(erro.message).toBe("Só a central regista a falta de uma equipa.");
  });

  it("o despachante não cancela nem encaixa ordens de outro operador (404)", () => {
    const cancelar = falha(() =>
      previsualizar(despachanteAzul, { cancelarId: "ord-vr-90001", permitirTroca: true }),
    );
    expect(cancelar.status).toBe(404);
    expect(cancelar.codigo).toBe("NAO_ENCONTRADO");
    expect(cancelar.message).toBe("Não encontrámos esta ordem.");

    const encaixar = falha(() =>
      previsualizar(despachanteAzul, { encaixarId: "ord-vd-urg", permitirTroca: true }),
    );
    expect(encaixar.status).toBe(404);
    expect(encaixar.codigo).toBe("NAO_ENCONTRADO");
    expect(encaixar.message).toBe("Não encontrámos esta ordem.");
  });

  it("previsualizar entrega ao motor o pedido limitado (apenasDoOperador + permitirTroca: false)", () => {
    vi.mocked(reencaixar).mockClear();
    previsualizar(despachanteVerde, { encaixarId: "ord-vd-urg", permitirTroca: true });
    expect(pedidoEntregueAoMotor()).toEqual({
      encaixarId: "ord-vd-urg",
      apenasDoOperador: "verde",
      permitirTroca: false,
    });
  });

  it("confirmarPlano entrega ao motor o pedido limitado (apenasDoOperador + permitirTroca: false)", () => {
    vi.mocked(reencaixar).mockClear();
    try {
      confirmarPlano(despachanteVerde, { encaixarId: "ord-vd-urg", permitirTroca: true }, "x".repeat(16));
    } catch {
      /* selo errado: 409 DESATUALIZADO vem depois do motor */
    }
    expect(pedidoEntregueAoMotor()).toEqual({
      encaixarId: "ord-vd-urg",
      apenasDoOperador: "verde",
      permitirTroca: false,
    });
  });

  it("força apenasDoOperador e desliga a troca: cancelar VR não encaixa a VD-URG alheia", () => {
    vi.mocked(reencaixar).mockClear();
    const vista = previsualizar(despachanteVermelho, {
      cancelarId: "ord-vr-90001",
      permitirTroca: true,
    });
    expect(pedidoEntregueAoMotor()).toEqual({
      cancelarId: "ord-vr-90001",
      apenasDoOperador: "vermelho",
      permitirTroca: false,
    });
    expect(vista.viavel).toBe(true);
    expect(vista.mensagem).toBe("A VR-90001 sai da Equipa Minho.");
    expect(vista.movimentos).toEqual([
      {
        tipo: "cancelar",
        referencia: "VR-90001",
        ordemId: "ord-vr-90001",
        deEquipaId: "eq-minho",
        paraEquipaId: null,
        motivo: "VR-90001 deixa de ocupar a equipa.",
      },
    ]);

    const central = previsualizar(admin, {
      cancelarId: "ord-vr-90001",
      permitirTroca: true,
    });
    expect(central.viavel).toBe(true);
    expect(central.mensagem).toBe(
      "A VR-90001 sai da Equipa Minho. A VD-URG entra às 08:00. A AZ-24081 passa a começar às 10:00.",
    );
    expect(central.movimentos).toEqual([
      {
        tipo: "cancelar",
        referencia: "VR-90001",
        ordemId: "ord-vr-90001",
        deEquipaId: "eq-minho",
        paraEquipaId: null,
        motivo: "VR-90001 deixa de ocupar a equipa.",
      },
      {
        tipo: "encaixar",
        referencia: "VD-URG",
        ordemId: "ord-vd-urg",
        deEquipaId: null,
        paraEquipaId: "eq-m024",
        motivo: "VD-URG sai da fila e entra na equipa que ainda tem sequência.",
      },
    ]);
  });

  it("o despachante verde encaixa a própria urgente sem pedir troca nem tocar no vermelho", () => {
    vi.mocked(reencaixar).mockClear();
    const vista = previsualizar(despachanteVerde, {
      encaixarId: "ord-vd-urg",
      permitirTroca: true,
    });
    expect(pedidoEntregueAoMotor()).toEqual({
      encaixarId: "ord-vd-urg",
      apenasDoOperador: "verde",
      permitirTroca: false,
    });
    expect(vista.viavel).toBe(true);
    expect(vista.mensagem).toBe("A VD-URG entra às 08:00.");
    expect(vista.movimentos).toEqual([
      {
        tipo: "encaixar",
        referencia: "VD-URG",
        ordemId: "ord-vd-urg",
        deEquipaId: null,
        paraEquipaId: "eq-m024",
        motivo: "VD-URG sai da fila e entra na equipa que ainda tem sequência.",
      },
    ]);
  });
});
