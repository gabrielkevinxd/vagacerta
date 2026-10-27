import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// B7: terminar a sessão só se faz com POST. Um GET (uma imagem ou uma ligação noutra página) não pode sair da sessão.
const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (jar.has(nome) ? { name: nome, value: jar.get(nome)! } : undefined),
    set: (nome: string, valor: string) => void jar.set(nome, valor),
    delete: (nome: string) => void jar.delete(nome),
  }),
  headers: async () => new Headers(),
}));
vi.mock("next/server", async (importar) => ({
  ...(await importar<typeof import("next/server")>()),
  connection: async () => undefined,
}));

import * as rota from "@/app/api/sessao/sair/route";
import { baseDados } from "@/server/db";
import { sessaoViva } from "@/server/sessao-viva";
import { abrirSessao, CONTAS, pedido } from "./http-simulado";

describe("terminar a sessão", () => {
  let token = "";

  beforeAll(() => {
    baseDados();
  });
  beforeEach(() => {
    token = abrirSessao(CONTAS.azul);
    jar.clear();
    jar.set("vc_sessao", token);
  });

  it("GET /api/sessao/sair responde 405, indica POST em Allow e mantém a sessão", async () => {
    const GET = (rota as unknown as { GET?: (pedido: Request) => Promise<Response> | Response }).GET;
    expect(typeof GET).toBe("function");
    const resposta = await GET!(pedido("GET", "/api/sessao/sair"));
    expect(resposta.status).toBe(405);
    expect(resposta.headers.get("allow")).toBe("POST");
    expect(jar.get("vc_sessao")).toBe(token);
    expect(sessaoViva(token)).toBe(true);
  });

  it("POST /api/sessao/sair termina a sessão", async () => {
    const resposta = await rota.POST();
    expect(resposta.status).toBe(200);
    expect(jar.has("vc_sessao")).toBe(false);
    expect(sessaoViva(token)).toBe(false);
  });
});
