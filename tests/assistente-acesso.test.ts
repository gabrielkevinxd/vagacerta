import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

import { GET as assistenteGET, POST as assistentePOST } from "@/app/api/assistente/route";
import { baseDados } from "@/server/db";
import { abrirSessao, CONTAS, contexto, pedido } from "./http-simulado";

function entrarComo(perfil: keyof typeof CONTAS | null) {
  jar.delete("vc_sessao");
  if (perfil) jar.set("vc_sessao", abrirSessao(CONTAS[perfil]));
}

describe("API /api/assistente — perfis", () => {
  beforeAll(() => {
    baseDados();
  });
  beforeEach(() => {
    jar.clear();
  });

  it("técnico recebe 403 no GET e no POST", async () => {
    entrarComo("tecnico");
    expect((await assistenteGET(pedido("GET", "/api/assistente"), contexto())).status).toBe(403);
    expect(
      (
        await assistentePOST(
          pedido("POST", "/api/assistente", { texto: "olá", data: "2026-10-27" }),
          contexto(),
        )
      ).status,
    ).toBe(403);
  });

  it("despachante e central leem o painel", async () => {
    for (const perfil of ["azul", "admin"] as const) {
      entrarComo(perfil);
      const resposta = await assistenteGET(pedido("GET", "/api/assistente"), contexto());
      expect(resposta.status, perfil).toBe(200);
    }
  });
});
