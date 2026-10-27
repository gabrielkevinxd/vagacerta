import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { OFSC_SEGREDO_DEMO, respostaSeSegredoOfscInvalido, segredoOfsc } from "@/server/ofsc/segredo";

describe("segredo OFSC (PR#2)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa OFSC_WEBHOOK_SECRET quando definido", () => {
    vi.stubEnv("OFSC_WEBHOOK_SECRET", "  configurado-por-ambiente-0123456789  ");
    expect(segredoOfsc()).toBe("configurado-por-ambiente-0123456789");
  });

  it("fora de produção, sem env, usa o segredo de demonstração", () => {
    vi.stubEnv("OFSC_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(segredoOfsc()).toBe(OFSC_SEGREDO_DEMO);
  });

  it("em produção sem env devolve null (503 no handler)", () => {
    vi.stubEnv("OFSC_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(segredoOfsc()).toBeNull();
    const resposta = respostaSeSegredoOfscInvalido(new Request("http://x"));
    expect(resposta?.status).toBe(503);
  });

  it("aceita x-vagacerta-ofsc-secret ou Bearer; rejeita errado", () => {
    vi.stubEnv("OFSC_WEBHOOK_SECRET", "segredo-teste-pr2");
    vi.stubEnv("NODE_ENV", "test");
    expect(
      respostaSeSegredoOfscInvalido(
        new Request("http://x", { headers: { "x-vagacerta-ofsc-secret": "segredo-teste-pr2" } }),
      ),
    ).toBeNull();
    expect(
      respostaSeSegredoOfscInvalido(
        new Request("http://x", { headers: { authorization: "Bearer segredo-teste-pr2" } }),
      ),
    ).toBeNull();
    expect(
      respostaSeSegredoOfscInvalido(
        new Request("http://x", { headers: { "x-vagacerta-ofsc-secret": "errado" } }),
      )?.status,
    ).toBe(401);
  });
});
