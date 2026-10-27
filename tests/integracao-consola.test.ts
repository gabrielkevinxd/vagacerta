import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Ator } from "@/lib/rules";
import { baseDados } from "@/server/db";
import { filtrarLogsDespachante, listarLogs, listarRetries, registarLog } from "@/server/ofsc/loja";
import { correrCenario } from "@/server/ofsc/cenarios";

const despachanteAzul: Ator = {
  id: "usr-azul",
  nome: "Clara Monteiro",
  papel: "despachante",
  operadorId: "azul",
  tecnicoId: null,
  equipaId: null,
};

describe("D1 integração consola", () => {
  beforeAll(() => {
    baseDados();
  });

  it("filtra logs de outros operadores e esconde JSON global", () => {
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
    registarLog("vagacerta", "Falta da equipa global sem JSON", { operadorId: null });

    const filtrados = filtrarLogsDespachante(listarLogs(), "azul");
    const texto = JSON.stringify(filtrados);
    expect(filtrados.some((l) => l.historia.includes("Azul"))).toBe(true);
    expect(filtrados.some((l) => l.historia.includes("Falta da equipa"))).toBe(true);
    expect(texto).not.toContain("Vera Vermelha");
    expect(texto).not.toContain("VR_RES");
    expect(texto).not.toContain("vermelho");
    expect(texto).not.toContain("OFSC dos outros");
    expect(texto).not.toContain('"secret"');
  });

  it("retries do despachante só contam o próprio operador e sem corpo", () => {
    baseDados()
      .prepare(
        "INSERT INTO integracao_retries (id, operador_id, metodo, caminho, corpo, tentativas, ultimo_erro, criado_em) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
      )
      .run("rty-azul-test", "azul", "POST", "/resources/AZ/absences", JSON.stringify({ x: 1 }), "erro", new Date().toISOString());
    baseDados()
      .prepare(
        "INSERT INTO integracao_retries (id, operador_id, metodo, caminho, corpo, tentativas, ultimo_erro, criado_em) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
      )
      .run("rty-vr-test", "vermelho", "POST", "/resources/VR_ABS/absences", JSON.stringify({ y: 2 }), "erro", new Date().toISOString());

    const proprios = listarRetries()
      .filter((r) => r.operador_id === despachanteAzul.operadorId)
      .map((r) => ({ id: r.id }));
    expect(proprios.some((r) => r.id === "rty-azul-test")).toBe(true);
    expect(proprios.some((r) => r.id === "rty-vr-test")).toBe(false);
    expect(JSON.stringify(proprios)).not.toContain("corpo");
    expect(JSON.stringify(proprios)).not.toContain("VR_ABS");
  });

  it("cenário dois_operadores como central gera dados vermelhos, filtrados ao despachante", async () => {
    await correrCenario("dois_operadores");
    const filtrados = filtrarLogsDespachante(listarLogs(), "azul");
    const texto = JSON.stringify(filtrados);
    expect(texto).not.toMatch(/VR[_-]/);
    expect(texto.toLowerCase()).not.toContain("vermelho");
  });
});
