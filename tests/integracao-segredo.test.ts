import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { segredoConfere, segredoDoPedido, segredoIntegracao } from "@/server/integracao-auth";
import { baseDados } from "@/server/db";

describe("segredo partilhado da integração OFSC", () => {
  const anterior = process.env.VC_OFSC_SEGREDO;

  beforeAll(() => {
    baseDados();
  });
  afterEach(() => {
    if (anterior === undefined) delete process.env.VC_OFSC_SEGREDO;
    else process.env.VC_OFSC_SEGREDO = anterior;
    vi.restoreAllMocks();
  });

  it("usa o segredo configurado por ambiente (VC_OFSC_SEGREDO)", () => {
    process.env.VC_OFSC_SEGREDO = "  configurado-por-ambiente-0123456789  ";
    expect(segredoIntegracao()).toBe("configurado-por-ambiente-0123456789");
    expect(segredoConfere("configurado-por-ambiente-0123456789")).toBe(true);
    expect(segredoConfere("outro-valor")).toBe(false);
  });

  it("sem configuração gera um segredo de desenvolvimento, guarda-o na base e devolve sempre o mesmo", () => {
    delete process.env.VC_OFSC_SEGREDO;
    const primeiro = segredoIntegracao();
    const segundo = segredoIntegracao();
    expect(primeiro).toMatch(/^[0-9a-f]{64}$/);
    expect(segundo).toBe(primeiro);
    const guardado = baseDados().prepare("SELECT valor FROM definicoes WHERE chave = 'segredo_integracao'").get() as {
      valor: string;
    };
    expect(guardado.valor).toBe(primeiro);
    expect(segredoConfere(primeiro)).toBe(true);
    expect(segredoConfere("")).toBe(false);
  });

  it("nunca imprime o segredo", () => {
    delete process.env.VC_OFSC_SEGREDO;
    const espioes = (["log", "info", "warn", "error", "debug"] as const).map((nivel) => vi.spyOn(console, nivel).mockImplementation(() => undefined));
    const segredo = segredoIntegracao();
    segredoConfere(segredo);
    segredoConfere("errado");
    for (const espiao of espioes) {
      expect(JSON.stringify(espiao.mock.calls)).not.toContain(segredo);
    }
  });

  it("lê o segredo do cabeçalho x-vagacerta-segredo ou de Authorization: Bearer", () => {
    expect(segredoDoPedido(new Request("http://x/", { headers: { "x-vagacerta-segredo": "abc" } }))).toBe("abc");
    expect(segredoDoPedido(new Request("http://x/", { headers: { authorization: "Bearer def" } }))).toBe("def");
    expect(segredoDoPedido(new Request("http://x/", { headers: { authorization: "Basic ghi" } }))).toBeNull();
    expect(segredoDoPedido(new Request("http://x/"))).toBeNull();
  });
});
