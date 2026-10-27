import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { baseDados, limparLogsGlobaisComJson, migrarLogsOperador } from "@/server/db";
import { OPERADOR_LOG_GLOBAL, filtrarLogsDespachante, listarLogs } from "@/server/ofsc/loja";

describe("migrarLogsOperador", () => {
  beforeAll(() => {
    baseDados();
  });

  it("preenche um operador, apaga multi-operador e sem pistas; * sem JSON fica filtrável", () => {
    const db = baseDados();
    const agora = new Date().toISOString();
    db.prepare(
      "INSERT INTO integracao_logs (id, quando, coluna, historia, metodo, caminho, pedido, resposta, codigo, operador_id) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL)",
    ).run("log-mig-azul", agora, "vagacerta", "Reserva Confirmada: AZ-MIG-1 na Equipa Litoral");
    db.prepare(
      "INSERT INTO integracao_logs (id, quando, coluna, historia, metodo, caminho, pedido, resposta, codigo, operador_id) VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, NULL)",
    ).run(
      "log-mig-multi",
      agora,
      "vagacerta",
      "AZ-MIG-2 — OFSC do Operador Vermelho em baixo",
      JSON.stringify({ customerName: "Segredo", streetAddress: "Rua X" }),
    );
    db.prepare(
      "INSERT INTO integracao_logs (id, quando, coluna, historia, metodo, caminho, pedido, resposta, codigo, operador_id) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL)",
    ).run("log-mig-vazio", agora, "vagacerta", "Linha sem pistas de operador");
    db.prepare(
      "INSERT INTO integracao_logs (id, quando, coluna, historia, metodo, caminho, pedido, resposta, codigo, operador_id) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL)",
    ).run("log-mig-global", agora, "vagacerta", "Falta da equipa eq-minho em 2026-10-27: ausências em todos os operadores");

    migrarLogsOperador(db);

    const azul = db.prepare("SELECT operador_id FROM integracao_logs WHERE id = ?").get("log-mig-azul") as
      | { operador_id: string }
      | undefined;
    expect(azul?.operador_id).toBe("azul");
    expect(db.prepare("SELECT id FROM integracao_logs WHERE id = ?").get("log-mig-multi")).toBeUndefined();
    expect(db.prepare("SELECT id FROM integracao_logs WHERE id = ?").get("log-mig-vazio")).toBeUndefined();
    const global = db.prepare("SELECT operador_id, pedido FROM integracao_logs WHERE id = ?").get("log-mig-global") as
      | { operador_id: string; pedido: string | null }
      | undefined;
    expect(global?.operador_id).toBe(OPERADOR_LOG_GLOBAL);
    expect(global?.pedido).toBeNull();

    // * com JSON não passa no filtro do despachante
    db.prepare(
      "INSERT INTO integracao_logs (id, quando, coluna, historia, metodo, caminho, pedido, resposta, codigo, operador_id) VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, ?)",
    ).run(
      "log-star-json",
      new Date().toISOString(),
      "vagacerta",
      "Global com JSON",
      JSON.stringify({ secret: true }),
      OPERADOR_LOG_GLOBAL,
    );
    const filtrados = filtrarLogsDespachante(listarLogs(undefined, 200, { operadorId: "azul" }), "azul");
    expect(filtrados.some((l) => l.id === "log-mig-global")).toBe(true);
    expect(filtrados.some((l) => l.id === "log-star-json")).toBe(false);
    expect(JSON.stringify(filtrados)).not.toContain('"secret"');

    limparLogsGlobaisComJson(db);
    expect(db.prepare("SELECT id FROM integracao_logs WHERE id = ?").get("log-star-json")).toBeUndefined();
    expect(db.prepare("SELECT id FROM integracao_logs WHERE id = ?").get("log-mig-global")).toBeTruthy();
  });
});
