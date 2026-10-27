import { beforeAll, describe, expect, it, vi } from "vitest";

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

import { PATCH as equipaPATCH } from "@/app/api/equipas/[id]/route";
import { baseDados } from "@/server/db";
import { abrirSessao, CONTAS, contexto, pedido } from "./http-simulado";

/**
 * P1 R1: erro de horário (formato inválido) via API — a UI mostra-o junto de
 * «Guardar horário», não sob Operadores servidos (ver captura v17 04b).
 */
describe("erro ao guardar horário da equipa", () => {
  beforeAll(() => {
    baseDados();
    jar.clear();
    jar.set("vc_sessao", abrirSessao(CONTAS.admin));
  });

  it("PATCH com HH:MM inválido devolve 400 e não grava", async () => {
    const antes = baseDados()
      .prepare("SELECT inicio, fim FROM horarios WHERE equipa_id = ? AND dia_semana = 1")
      .get("eq-minho") as { inicio: string; fim: string };

    const resposta = await equipaPATCH(
      pedido("PATCH", "/api/equipas/eq-minho", {
        horarios: [{ diaSemana: 1, inicio: "08:00", fim: "xx:yy" }],
      }),
      contexto({ id: "eq-minho" }),
    );
    expect(resposta.status).toBe(400);
    const corpo = (await resposta.json()) as { codigo?: string; mensagem?: string };
    expect(corpo.codigo).toBe("DADOS_INVALIDOS");
    expect(corpo.mensagem).toMatch(/HH:MM/i);

    const depois = baseDados()
      .prepare("SELECT inicio, fim FROM horarios WHERE equipa_id = ? AND dia_semana = 1")
      .get("eq-minho") as { inicio: string; fim: string };
    expect(depois).toEqual(antes);
  });
});
