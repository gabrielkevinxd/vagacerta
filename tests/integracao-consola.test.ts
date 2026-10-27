import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const atorAtual = vi.hoisted(() => ({
  valor: null as import("@/lib/rules").Ator | null,
}));

vi.mock("@/server/sessao", () => ({
  obterAtor: async () => atorAtual.valor,
}));

vi.mock("@/server/idioma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/idioma")>();
  return {
    ...actual,
    lerIdiomaPedido: async () => "pt-PT" as const,
  };
});

import type { Ator } from "@/lib/rules";
import { baseDados } from "@/server/db";
import {
  OPERADOR_LOG_GLOBAL,
  filtrarLogsDespachante,
  listarLogs,
  listarRetries,
  registarLog,
} from "@/server/ofsc/loja";
import { correrCenario } from "@/server/ofsc/cenarios";
import { GET as consolaGet } from "@/app/api/integracao/consola/route";
import { GET as vagasGet } from "@/app/api/integracao/vagas/route";
import { POST as reservaPost } from "@/app/api/integracao/reserva/route";
import { POST as reconciliarPost } from "@/app/api/integracao/reconciliar/route";
import { POST as eventosPost } from "@/app/api/integracao/ofsc/eventos/route";
import { OFSC_SEGREDO_DEMO } from "@/server/ofsc/segredo";

const despachanteAzul: Ator = {
  id: "usr-azul",
  nome: "Clara Monteiro",
  papel: "despachante",
  operadorId: "azul",
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

const admin: Ator = {
  id: "usr-admin",
  nome: "Teresa Varela",
  papel: "administrador",
  operadorId: null,
  tecnicoId: null,
  equipaId: null,
};

async function jsonDe(resposta: Response) {
  return { status: resposta.status, corpo: await resposta.json() };
}

describe("D1 integração consola", () => {
  beforeAll(() => {
    baseDados();
  });

  it("filtra logs de outros operadores; null antigo não passa; global só com *", () => {
    registarLog("origem", "OFSC Azul pediu reserva", {
      pedido: { customerName: "Ana Azul" },
      operadorId: "azul",
    });
    registarLog("origem", "OFSC Vermelho pediu reserva", {
      pedido: { customerName: "Vera Vermelha", resourceId: "VR_RES" },
      operadorId: "vermelho",
    });
    registarLog("vagacerta", "Reconciliação no Vermelho", {
      pedido: { name: "ausencia" },
      caminho: "/api/ofsc/vermelho/resources/VR_X/absences",
      operadorId: "vermelho",
    });
    registarLog("outros", "OFSC dos outros", {
      pedido: { secret: true },
      operadorId: "verde",
    });
    registarLog("vagacerta", "Falta da equipa global sem JSON", { operadorId: OPERADOR_LOG_GLOBAL });

    baseDados()
      .prepare(
        "INSERT INTO integracao_logs (id, quando, coluna, historia, metodo, caminho, pedido, resposta, codigo, operador_id) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL)",
      )
      .run(`log-null-${crypto.randomUUID()}`, new Date().toISOString(), "vagacerta", "Ordem VM-LEGACY cancelada sem operador");

    const filtrados = filtrarLogsDespachante(listarLogs(undefined, 120, { operadorId: "azul" }), "azul");
    const texto = JSON.stringify(filtrados);
    expect(filtrados.some((l) => l.historia.includes("Azul"))).toBe(true);
    expect(filtrados.some((l) => l.historia.includes("Falta da equipa"))).toBe(true);
    expect(filtrados.some((l) => l.historia.includes("VM-LEGACY"))).toBe(false);
    expect(texto).not.toContain("Vera Vermelha");
    expect(texto).not.toContain("VR_RES");
    expect(texto).not.toContain("OFSC dos outros");
    expect(texto).not.toContain('"secret"');
    expect(texto).not.toContain("VM-LEGACY");
  });

  it("rota consola: despachante só vê o próprio; retries sem corpo; null antigo oculto", async () => {
    baseDados()
      .prepare(
        "INSERT INTO integracao_retries (id, operador_id, metodo, caminho, corpo, tentativas, ultimo_erro, criado_em) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
      )
      .run(
        "rty-azul-route",
        "azul",
        "POST",
        "/resources/AZ/absences",
        JSON.stringify({ x: 1 }),
        "erro",
        new Date().toISOString(),
      );
    baseDados()
      .prepare(
        "INSERT INTO integracao_retries (id, operador_id, metodo, caminho, corpo, tentativas, ultimo_erro, criado_em) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
      )
      .run(
        "rty-vr-route",
        "vermelho",
        "POST",
        "/resources/VR_ABS/absences",
        JSON.stringify({ y: 2 }),
        "erro",
        new Date().toISOString(),
      );
    baseDados()
      .prepare(
        "INSERT INTO integracao_logs (id, quando, coluna, historia, metodo, caminho, pedido, resposta, codigo, operador_id) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL)",
      )
      .run(`log-null-route-${crypto.randomUUID()}`, new Date().toISOString(), "vagacerta", "Reserva Confirmada: VM-ROTA na Equipa X");

    atorAtual.valor = despachanteAzul;
    const { status, corpo } = await jsonDe(
      await consolaGet(new Request("http://local/api/integracao/consola"), { params: Promise.resolve({}) }),
    );
    expect(status).toBe(200);
    const texto = JSON.stringify(corpo);
    expect(texto).not.toContain("VM-ROTA");
    expect(texto).not.toContain("VR_ABS");
    expect(corpo.retries.some((r: { id: string }) => r.id === "rty-azul-route")).toBe(true);
    expect(corpo.retries.some((r: { id: string }) => r.id === "rty-vr-route")).toBe(false);
    expect(corpo.retries.every((r: Record<string, unknown>) => Object.keys(r).length === 1 && r.id)).toBe(true);
    expect(listarRetries().some((r) => r.id === "rty-vr-route")).toBe(true);
  });

  it("rota vagas: despachante bloqueado a outro operador", async () => {
    atorAtual.valor = despachanteAzul;
    const { status, corpo } = await jsonDe(
      await vagasGet(new Request("http://local/api/integracao/vagas?operador=vermelho&data=2026-10-27"), {
        params: Promise.resolve({}),
      }),
    );
    expect(status).toBe(403);
    expect(JSON.stringify(corpo)).toMatch(/operador/i);
  });

  it("técnico recebe 403 em consola, vagas e reserva; reconciliar é só central", async () => {
    atorAtual.valor = tecnico;
    const consola = await jsonDe(
      await consolaGet(new Request("http://local/api/integracao/consola"), { params: Promise.resolve({}) }),
    );
    expect(consola.status).toBe(403);

    const vagas = await jsonDe(
      await vagasGet(new Request("http://local/api/integracao/vagas?operador=azul&data=2026-10-27"), {
        params: Promise.resolve({}),
      }),
    );
    expect(vagas.status).toBe(403);

    const reserva = await jsonDe(
      await reservaPost(
        new Request("http://local/api/integracao/reserva", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            operadorId: "azul",
            zona: "zn-n04",
            data: "2026-10-27",
            janelaInicio: "08:00",
            janelaFim: "13:00",
            tipoIntervencao: "instalacao",
            resourceId: "AZ_RES_LITORAL",
            apptNumber: "AZ-TEST-TEC",
          }),
        }),
        { params: Promise.resolve({}) },
      ),
    );
    expect(reserva.status).toBe(403);

    const reconTecnico = await jsonDe(
      await reconciliarPost(new Request("http://local/api/integracao/reconciliar", { method: "POST" }), {
        params: Promise.resolve({}),
      }),
    );
    expect(reconTecnico.status).toBe(403);

    atorAtual.valor = despachanteAzul;
    const reconDespacho = await jsonDe(
      await reconciliarPost(new Request("http://local/api/integracao/reconciliar", { method: "POST" }), {
        params: Promise.resolve({}),
      }),
    );
    expect(reconDespacho.status).toBe(403);

    atorAtual.valor = admin;
    const reconAdmin = await jsonDe(
      await reconciliarPost(new Request("http://local/api/integracao/reconciliar", { method: "POST" }), {
        params: Promise.resolve({}),
      }),
    );
    expect(reconAdmin.status).toBe(200);
  });

  it("webhook OFSC exige segredo; demo aceita o valor por omissão", async () => {
    const sem = await eventosPost(
      new Request("http://local/api/integracao/ofsc/eventos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operator: "azul", eventType: "activityCreated" }),
      }),
    );
    expect(sem.status).toBe(401);

    const com = await eventosPost(
      new Request("http://local/api/integracao/ofsc/eventos", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-vagacerta-ofsc-secret": OFSC_SEGREDO_DEMO,
        },
        body: JSON.stringify({ operator: "azul", eventType: "activityCreated" }),
      }),
    );
    // Segredo ok; payload incompleto → 400 (não 401).
    expect(com.status).toBe(400);
  });

  it("cenário dois_operadores como central gera dados vermelhos, filtrados ao despachante", async () => {
    await correrCenario("dois_operadores");
    const filtrados = filtrarLogsDespachante(listarLogs(undefined, 120, { operadorId: "azul" }), "azul");
    const texto = JSON.stringify(filtrados);
    expect(texto).not.toMatch(/VR[_-]/);
    expect(texto.toLowerCase()).not.toContain("vermelho");
  });
});
