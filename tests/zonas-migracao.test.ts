import { describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("server-only", () => ({}));

describe("P1-7 bases zn-* pedem demo:reset", () => {
  it("exigirZonasMunicipio recusa zonas zn-%", async () => {
    const { exigirZonasMunicipio } = await import("@/server/db");
    const pasta = join(tmpdir(), `vc-zn-${crypto.randomUUID()}`);
    mkdirSync(pasta, { recursive: true });
    const caminho = join(pasta, "vagacerta.sqlite");
    const db = new DatabaseSync(caminho);
    db.exec(`
      CREATE TABLE zonas (
        id TEXT PRIMARY KEY,
        regiao_id TEXT NOT NULL,
        codigo TEXT NOT NULL,
        nome TEXT NOT NULL
      );
      INSERT INTO zonas (id, regiao_id, codigo, nome) VALUES ('zn-n01', 'rg-norte', 'N01', 'Minho');
    `);
    expect(() => exigirZonasMunicipio(db)).toThrow(/demo:reset|zn-\*/);
    db.close();
    rmSync(pasta, { recursive: true, force: true });
  });
});
