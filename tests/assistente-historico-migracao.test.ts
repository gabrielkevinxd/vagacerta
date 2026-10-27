import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }));

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

/**
 * Upgrade do histórico: BD #11 (id TEXT) e #12 (seq+utilizador_id) têm de abrir
 * sem o P0 (índice sobre sessao_token em criarEsquema) e permitir login.
 */

const SCHEMA_MINIMO = `
  CREATE TABLE utilizadores (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    palavra_passe_hash TEXT NOT NULL,
    papel TEXT NOT NULL,
    operador_id TEXT,
    tecnico_id TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    idioma TEXT NOT NULL DEFAULT 'pt-PT'
  );
  CREATE TABLE sessoes (
    token TEXT PRIMARY KEY,
    utilizador_id TEXT NOT NULL REFERENCES utilizadores(id),
    expira_em TEXT NOT NULL,
    criada_em TEXT NOT NULL
  );
`;

function colunasDe(db: DatabaseSync, tabela: string): string[] {
  return (db.prepare(`PRAGMA table_info(${tabela})`).all() as { name: string }[]).map((c) => c.name);
}

function prepararBaseAntiga(pasta: string, versao: "v11" | "v12"): void {
  const ficheiro = path.join(pasta, "vagacerta.sqlite");
  const db = new DatabaseSync(ficheiro);
  db.exec(SCHEMA_MINIMO);
  if (versao === "v11") {
    db.exec(`
      CREATE TABLE assistente_historico (
        id TEXT PRIMARY KEY,
        utilizador_id TEXT NOT NULL,
        papel TEXT NOT NULL,
        texto TEXT NOT NULL,
        em TEXT NOT NULL
      );
    `);
    db.prepare("INSERT INTO assistente_historico (id, utilizador_id, papel, texto, em) VALUES (?, ?, ?, ?, ?)").run(
      "ah-1",
      "u-admin",
      "utilizador",
      "olá",
      new Date().toISOString(),
    );
  } else {
    db.exec(`
      CREATE TABLE assistente_historico (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        utilizador_id TEXT NOT NULL,
        papel TEXT NOT NULL,
        texto TEXT NOT NULL,
        em TEXT NOT NULL
      );
    `);
    db.prepare("INSERT INTO assistente_historico (utilizador_id, papel, texto, em) VALUES (?, ?, ?, ?)").run(
      "u-admin",
      "utilizador",
      "olá",
      new Date().toISOString(),
    );
  }
  db.close();
}

describe("migração assistente_historico (#11 / #12 → sessão)", () => {
  const pastas: string[] = [];
  let guardado: { base: unknown; pasta: string | undefined } | null = null;

  afterEach(() => {
    const global = globalThis as { __vcDb?: { close(): void } | undefined };
    try {
      global.__vcDb?.close();
    } catch {
      /* já fechada */
    }
    if (guardado) {
      global.__vcDb = guardado.base as typeof global.__vcDb;
      if (guardado.pasta === undefined) delete process.env.VC_DATA_DIR;
      else process.env.VC_DATA_DIR = guardado.pasta;
      guardado = null;
    }
    vi.resetModules();
    jar.clear();
    while (pastas.length) {
      const pasta = pastas.pop()!;
      try {
        rmSync(pasta, { recursive: true, force: true });
      } catch {
        /* tmp */
      }
    }
  });

  async function upgradeELogin(versao: "v11" | "v12") {
    const pasta = mkdtempSync(path.join(tmpdir(), `vc-ah-${versao}-`));
    pastas.push(pasta);
    guardado = {
      base: (globalThis as { __vcDb?: unknown }).__vcDb,
      pasta: process.env.VC_DATA_DIR,
    };
    (globalThis as { __vcDb?: unknown }).__vcDb = undefined;
    prepararBaseAntiga(pasta, versao);

    process.env.VC_DATA_DIR = pasta;
    vi.resetModules();
    jar.clear();

    const { baseDados, migrarAssistenteHistorico } = await import("@/server/db");
    // P0: não pode lançar "no such column: sessao_token" ao criar o índice.
    const db = baseDados();
    const cols = colunasDe(db, "assistente_historico");
    expect(cols).toContain("sessao_token");
    expect(cols).toContain("origem");
    expect(cols).not.toContain("utilizador_id");
    const indices = db.prepare("PRAGMA index_list(assistente_historico)").all() as { name: string }[];
    expect(indices.some((i) => i.name === "idx_assistente_historico_sessao")).toBe(true);

    const { entrar } = await import("@/server/sessao");
    const ator = await entrar("admin@vagacerta.exemplo", "vagacerta-admin");
    expect(ator?.papel).toBe("administrador");
    expect(jar.has("vc_sessao")).toBe(true);

    // Idempotente.
    migrarAssistenteHistorico(db);
    migrarAssistenteHistorico(db);
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_assistente_historico_sessao ON assistente_historico (sessao_token, seq)",
    );
    expect(colunasDe(db, "assistente_historico")).toEqual(
      expect.arrayContaining(["seq", "sessao_token", "papel", "texto", "em", "origem"]),
    );
  }

  it("BD #11 (id TEXT): abre, migra, login e índice idempotente", async () => {
    await upgradeELogin("v11");
  });

  it("BD #12 (seq+utilizador_id): abre, migra, login e índice idempotente", async () => {
    await upgradeELogin("v12");
  });

  it("rollback se a migração falhar a meio", async () => {
    const pasta = mkdtempSync(path.join(tmpdir(), "vc-ah-rollback-"));
    pastas.push(pasta);
    guardado = {
      base: (globalThis as { __vcDb?: unknown }).__vcDb,
      pasta: process.env.VC_DATA_DIR,
    };
    (globalThis as { __vcDb?: unknown }).__vcDb = undefined;

    const ficheiro = path.join(pasta, "vagacerta.sqlite");
    const bruto = new DatabaseSync(ficheiro);
    bruto.exec(SCHEMA_MINIMO);
    bruto.exec(`
      CREATE TABLE assistente_historico (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        utilizador_id TEXT NOT NULL,
        papel TEXT NOT NULL,
        texto TEXT NOT NULL,
        em TEXT NOT NULL
      );
    `);
    bruto
      .prepare("INSERT INTO assistente_historico (utilizador_id, papel, texto, em) VALUES (?, ?, ?, ?)")
      .run("u-admin", "utilizador", "preservar", "2026-01-01T00:00:00.000Z");
    bruto.close();

    process.env.VC_DATA_DIR = pasta;
    vi.resetModules();
    const { migrarAssistenteHistorico } = await import("@/server/db");
    const db = new DatabaseSync(ficheiro);
    db.exec("PRAGMA foreign_keys = ON;");
    const execOriginal = db.exec.bind(db);
    db.exec = ((sql: string) => {
      if (typeof sql === "string" && /CREATE TABLE assistente_historico/.test(sql) && /sessao_token/.test(sql)) {
        throw new Error("falha forçada a meio da migração");
      }
      return execOriginal(sql);
    }) as typeof db.exec;
    expect(() => migrarAssistenteHistorico(db)).toThrow(/falha forçada/);
    // DROP foi revertido: dados e coluna antigas permanecem.
    expect(colunasDe(db, "assistente_historico")).toContain("utilizador_id");
    expect(colunasDe(db, "assistente_historico")).not.toContain("sessao_token");
    const linhas = db.prepare("SELECT texto FROM assistente_historico").all() as { texto: string }[];
    expect(linhas.map((l) => l.texto)).toEqual(["preservar"]);
    db.close();
  });
});

describe("limparSessoesExpiradas", () => {
  it("no open da BD não limpa sessões; no login apaga expiradas e o histórico ligado", async () => {
    const { baseDados } = await import("@/server/db");
    const db = baseDados();
    const utilizador = db.prepare("SELECT id FROM utilizadores WHERE email = ?").get("admin@vagacerta.exemplo") as {
      id: string;
    };
    const token = `expirado-${Date.now()}`;
    const passado = new Date(Date.now() - 60_000).toISOString();
    db.prepare("INSERT INTO sessoes (token, utilizador_id, expira_em, criada_em) VALUES (?, ?, ?, ?)").run(
      token,
      utilizador.id,
      passado,
      passado,
    );
    db.prepare(
      "INSERT INTO assistente_historico (sessao_token, papel, texto, em, origem) VALUES (?, ?, ?, ?, ?)",
    ).run(token, "utilizador", "ghost", passado, null);

    // Reabrir / migrar não deve chamar limparSessoesExpiradas (evita new Date no prerender).
    const { migrarAssistenteHistorico } = await import("@/server/db");
    migrarAssistenteHistorico(db);
    expect(db.prepare("SELECT token FROM sessoes WHERE token = ?").get(token)).toBeDefined();
    expect(
      (db.prepare("SELECT COUNT(*) AS n FROM assistente_historico WHERE sessao_token = ?").get(token) as { n: number }).n,
    ).toBe(1);

    jar.clear();
    const { entrar } = await import("@/server/sessao");
    const ator = await entrar("admin@vagacerta.exemplo", "vagacerta-admin");
    expect(ator).not.toBeNull();
    expect(db.prepare("SELECT token FROM sessoes WHERE token = ?").get(token)).toBeUndefined();
    expect(
      (db.prepare("SELECT COUNT(*) AS n FROM assistente_historico WHERE sessao_token = ?").get(token) as { n: number }).n,
    ).toBe(0);
  });

  it("limparSessoesExpiradas apaga sessões expiradas e o histórico por CASCADE", async () => {
    const { baseDados, limparSessoesExpiradas } = await import("@/server/db");
    const db = baseDados();
    const utilizador = db.prepare("SELECT id FROM utilizadores LIMIT 1").get() as { id: string };
    const token = `expirado-directo-${Date.now()}`;
    const passado = new Date(Date.now() - 60_000).toISOString();
    db.prepare("INSERT INTO sessoes (token, utilizador_id, expira_em, criada_em) VALUES (?, ?, ?, ?)").run(
      token,
      utilizador.id,
      passado,
      passado,
    );
    db.prepare(
      "INSERT INTO assistente_historico (sessao_token, papel, texto, em, origem) VALUES (?, ?, ?, ?, ?)",
    ).run(token, "utilizador", "ghost", passado, null);
    limparSessoesExpiradas(db);
    expect(db.prepare("SELECT token FROM sessoes WHERE token = ?").get(token)).toBeUndefined();
    expect(
      (db.prepare("SELECT COUNT(*) AS n FROM assistente_historico WHERE sessao_token = ?").get(token) as { n: number }).n,
    ).toBe(0);
  });

  it("obterAtor com cookie válido limpa sessões expiradas de OUTRO utilizador (S2′)", async () => {
    const { baseDados } = await import("@/server/db");
    const db = baseDados();
    const azul = db.prepare("SELECT id FROM utilizadores WHERE email = ?").get("azul@vagacerta.exemplo") as {
      id: string;
    };
    const vermelho = db.prepare("SELECT id FROM utilizadores WHERE email = ?").get("vermelho@vagacerta.exemplo") as {
      id: string;
    };
    const tokenExpirado = `expirado-outro-${Date.now()}`;
    const tokenVivo = `vivo-vermelho-${Date.now()}`;
    const passado = new Date(Date.now() - 60_000).toISOString();
    const futuro = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    db.prepare("INSERT INTO sessoes (token, utilizador_id, expira_em, criada_em) VALUES (?, ?, ?, ?)").run(
      tokenExpirado,
      azul.id,
      passado,
      passado,
    );
    db.prepare(
      "INSERT INTO assistente_historico (sessao_token, papel, texto, em, origem) VALUES (?, ?, ?, ?, ?)",
    ).run(tokenExpirado, "utilizador", "histórico azul expirado", passado, null);
    db.prepare("INSERT INTO sessoes (token, utilizador_id, expira_em, criada_em) VALUES (?, ?, ?, ?)").run(
      tokenVivo,
      vermelho.id,
      futuro,
      passado,
    );

    jar.clear();
    jar.set("vc_sessao", tokenVivo);
    const { obterAtor } = await import("@/server/sessao");
    const ator = await obterAtor();
    expect(ator?.operadorId).toBe("vermelho");
    // Sem limparSessoesExpiradas() em obterAtor, o token do azul ficaria — o mutante falha aqui.
    expect(db.prepare("SELECT token FROM sessoes WHERE token = ?").get(tokenExpirado)).toBeUndefined();
    expect(
      (db.prepare("SELECT COUNT(*) AS n FROM assistente_historico WHERE sessao_token = ?").get(tokenExpirado) as {
        n: number;
      }).n,
    ).toBe(0);
    expect(db.prepare("SELECT token FROM sessoes WHERE token = ?").get(tokenVivo)).toBeDefined();
  });
});
