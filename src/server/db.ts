import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  EQUIPA_CCO,
  OPERADORES_DEMO,
  ccosDemonstracao,
  criarMundoDemonstracao,
  historicoDemonstracao,
  regioesDemonstracao,
  tecnicosDemonstracao,
  utilizadoresDemonstracao,
  vigenciasDemonstracao,
  zonasDemonstracao,
} from "@/lib/demonstracao";
import type { Categoria, Equipa, Mundo, OperadorId, Ordem, Tecnologia } from "@/lib/rules";

const globalParaDb = globalThis as unknown as { __vcDb?: DatabaseSync };

function abrir(): DatabaseSync {
  if (globalParaDb.__vcDb) {
    migrar(globalParaDb.__vcDb);
    return globalParaDb.__vcDb;
  }
  const pasta = join(process.cwd(), "data");
  mkdirSync(pasta, { recursive: true });
  const db = new DatabaseSync(join(pasta, "vagacerta.sqlite"));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  criarEsquema(db);
  migrar(db);
  semear(db);
  semearOfsc(db);
  globalParaDb.__vcDb = db;
  return db;
}

export function baseDados(): DatabaseSync {
  return abrir();
}

function criarEsquema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS operadores (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cor TEXT NOT NULL,
      horizonte_dias INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS utilizadores (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      palavra_passe_hash TEXT NOT NULL,
      papel TEXT NOT NULL,
      operador_id TEXT REFERENCES operadores(id),
      tecnico_id TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      idioma TEXT NOT NULL DEFAULT 'pt-PT'
    );
    CREATE TABLE IF NOT EXISTS sessoes (
      token TEXT PRIMARY KEY,
      utilizador_id TEXT NOT NULL REFERENCES utilizadores(id),
      expira_em TEXT NOT NULL,
      criada_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS regioes (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS zonas (
      id TEXT PRIMARY KEY,
      regiao_id TEXT NOT NULL REFERENCES regioes(id),
      codigo TEXT NOT NULL,
      nome TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ccos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS equipas (
      id TEXT PRIMARY KEY,
      codigo TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      cco_id TEXT NOT NULL REFERENCES ccos(id),
      base TEXT NOT NULL,
      areas TEXT NOT NULL,
      ativa INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS equipa_zona (
      id TEXT PRIMARY KEY,
      equipa_id TEXT NOT NULL REFERENCES equipas(id),
      zona_id TEXT NOT NULL REFERENCES zonas(id),
      inicio TEXT NOT NULL,
      fim TEXT
    );
    CREATE TABLE IF NOT EXISTS tecnicos (
      id TEXT PRIMARY KEY,
      equipa_id TEXT NOT NULL REFERENCES equipas(id),
      nome TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS competencias (
      equipa_id TEXT NOT NULL REFERENCES equipas(id),
      operador_id TEXT NOT NULL REFERENCES operadores(id),
      categorias TEXT NOT NULL,
      tecnologias TEXT NOT NULL,
      PRIMARY KEY (equipa_id, operador_id)
    );
    CREATE TABLE IF NOT EXISTS horarios (
      id TEXT PRIMARY KEY,
      equipa_id TEXT NOT NULL REFERENCES equipas(id),
      dia_semana INTEGER NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS indisponibilidades (
      id TEXT PRIMARY KEY,
      equipa_id TEXT NOT NULL REFERENCES equipas(id),
      data TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT NOT NULL,
      motivo TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ordens (
      id TEXT PRIMARY KEY,
      operador_id TEXT NOT NULL REFERENCES operadores(id),
      referencia TEXT NOT NULL,
      area TEXT NOT NULL,
      zona_id TEXT NOT NULL REFERENCES zonas(id),
      equipa_id TEXT REFERENCES equipas(id),
      categoria TEXT NOT NULL,
      tecnologia TEXT,
      data TEXT NOT NULL,
      janela_inicio TEXT NOT NULL,
      janela_fim TEXT NOT NULL,
      duracao_min INTEGER NOT NULL,
      prioridade TEXT NOT NULL,
      estado TEXT NOT NULL,
      inicio_planeado TEXT,
      fim_planeado TEXT,
      inicio_fixado INTEGER NOT NULL DEFAULT 0,
      cliente_nome TEXT NOT NULL,
      cliente_contacto TEXT NOT NULL,
      morada TEXT NOT NULL,
      nota TEXT NOT NULL DEFAULT '',
      motivo_cancelamento TEXT,
      quem_pediu TEXT,
      criada_por TEXT,
      criada_em TEXT NOT NULL,
      UNIQUE (operador_id, referencia)
    );
    CREATE TABLE IF NOT EXISTS historico_ordens (
      id TEXT PRIMARY KEY,
      ordem_id TEXT NOT NULL REFERENCES ordens(id),
      quando TEXT NOT NULL,
      utilizador_id TEXT,
      acao TEXT NOT NULL,
      detalhe TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS definicoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auditoria (
      id TEXT PRIMARY KEY,
      quando TEXT NOT NULL,
      utilizador_id TEXT,
      acao TEXT NOT NULL,
      detalhe TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ordens_equipa_data ON ordens (equipa_id, data);
    CREATE INDEX IF NOT EXISTS idx_ordens_operador_data ON ordens (operador_id, data);
    CREATE INDEX IF NOT EXISTS idx_ordens_estado ON ordens (estado);
    CREATE INDEX IF NOT EXISTS idx_historico_ordem ON historico_ordens (ordem_id, quando);
    CREATE TABLE IF NOT EXISTS lotes_simulacao (
      id TEXT PRIMARY KEY,
      semente INTEGER NOT NULL,
      inicio TEXT NOT NULL,
      semanas INTEGER NOT NULL,
      criado_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lote_recusas (
      id TEXT PRIMARY KEY,
      lote_id TEXT NOT NULL REFERENCES lotes_simulacao(id),
      referencia TEXT NOT NULL,
      operador_id TEXT NOT NULL,
      data TEXT NOT NULL,
      motivo TEXT NOT NULL,
      detalhe TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ofsc_recursos (
      resource_id TEXT PRIMARY KEY,
      operador_id TEXT NOT NULL,
      equipa_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ofsc_atividades (
      activity_id TEXT PRIMARY KEY,
      operador_id TEXT NOT NULL,
      resource_id TEXT,
      bucket TEXT NOT NULL DEFAULT 'DST_TELECOM',
      estado TEXT NOT NULL,
      data TEXT NOT NULL,
      janela_inicio TEXT NOT NULL,
      janela_fim TEXT NOT NULL,
      categoria TEXT NOT NULL,
      tecnologia TEXT,
      area TEXT NOT NULL,
      zona_id TEXT NOT NULL,
      cliente_nome TEXT NOT NULL,
      cliente_contacto TEXT NOT NULL,
      morada TEXT NOT NULL,
      nota TEXT NOT NULL DEFAULT '',
      referencia TEXT,
      ordem_id TEXT,
      corpo_json TEXT NOT NULL,
      criada_em TEXT NOT NULL,
      atualizada_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ofsc_ausencias (
      id TEXT PRIMARY KEY,
      operador_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      activity_id TEXT,
      data TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT NOT NULL,
      nome TEXT NOT NULL,
      criada_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ofsc_saude (
      operador_id TEXT PRIMARY KEY,
      em_baixo INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS integracao_eventos (
      activity_id TEXT NOT NULL,
      assinatura TEXT NOT NULL,
      tipo TEXT NOT NULL,
      processado_em TEXT NOT NULL,
      resultado TEXT NOT NULL,
      PRIMARY KEY (activity_id, assinatura)
    );
    CREATE TABLE IF NOT EXISTS integracao_retries (
      id TEXT PRIMARY KEY,
      operador_id TEXT NOT NULL,
      metodo TEXT NOT NULL,
      caminho TEXT NOT NULL,
      corpo TEXT NOT NULL,
      tentativas INTEGER NOT NULL,
      ultimo_erro TEXT,
      criado_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS integracao_logs (
      id TEXT PRIMARY KEY,
      quando TEXT NOT NULL,
      coluna TEXT NOT NULL,
      historia TEXT NOT NULL,
      metodo TEXT,
      caminho TEXT,
      pedido TEXT,
      resposta TEXT,
      codigo INTEGER,
      operador_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_integracao_logs_quando ON integracao_logs (quando);
  `);
}

function garantirColuna(db: DatabaseSync, tabela: string, coluna: string, sql: string): void {
  const colunas = db.prepare(`PRAGMA table_info(${tabela})`).all() as { name: string }[];
  if (!colunas.some((linha) => linha.name === coluna)) db.exec(sql);
}

function migrar(db: DatabaseSync): void {
  const colunas = db.prepare("PRAGMA table_info(utilizadores)").all() as { name: string }[];
  if (!colunas.some((coluna) => coluna.name === "idioma")) {
    db.exec("ALTER TABLE utilizadores ADD COLUMN idioma TEXT NOT NULL DEFAULT 'pt-PT'");
  }
  garantirColuna(db, "ordens", "lote_id", "ALTER TABLE ordens ADD COLUMN lote_id TEXT");
  garantirColuna(db, "ofsc_atividades", "lote_id", "ALTER TABLE ofsc_atividades ADD COLUMN lote_id TEXT");
  garantirColuna(db, "ofsc_ausencias", "lote_id", "ALTER TABLE ofsc_ausencias ADD COLUMN lote_id TEXT");
  garantirColuna(db, "indisponibilidades", "lote_id", "ALTER TABLE indisponibilidades ADD COLUMN lote_id TEXT");
  garantirColuna(db, "integracao_logs", "operador_id", "ALTER TABLE integracao_logs ADD COLUMN operador_id TEXT");
  migrarLogsOperador(db);
  semearOfsc(db);
}

/** Backfill `operador_id` quando dedutível; apaga o resto. Globais passam a `*`. */
function migrarLogsOperador(db: DatabaseSync): void {
  const nulos = db
    .prepare(
      "SELECT id, historia, metodo, caminho, pedido, resposta FROM integracao_logs WHERE operador_id IS NULL",
    )
    .all() as {
    id: string;
    historia: string;
    metodo: string | null;
    caminho: string | null;
    pedido: string | null;
    resposta: string | null;
  }[];
  if (nulos.length === 0) return;
  const atualizar = db.prepare("UPDATE integracao_logs SET operador_id = ? WHERE id = ?");
  const apagar = db.prepare("DELETE FROM integracao_logs WHERE id = ?");
  for (const linha of nulos) {
    const deduzido = deduzirOperadorLog(linha);
    if (deduzido) atualizar.run(deduzido, linha.id);
    else apagar.run(linha.id);
  }
}

function deduzirOperadorLog(linha: {
  historia: string;
  metodo: string | null;
  caminho: string | null;
  pedido: string | null;
  resposta: string | null;
}): "azul" | "vermelho" | "verde" | "*" | null {
  const texto = [linha.historia, linha.caminho, linha.pedido, linha.resposta, linha.metodo]
    .filter(Boolean)
    .join("\n");
  if (/falta da equipa|todos os operadores/i.test(texto) && !linha.pedido) return "*";
  const hits = new Set<"azul" | "vermelho" | "verde">();
  if (/\bazul\b|\/ofsc\/azul\b|\bAZ[_-]/i.test(texto)) hits.add("azul");
  if (/\bvermelho\b|\/ofsc\/vermelho\b|\bVR[_-]/i.test(texto)) hits.add("vermelho");
  if (/\bverde\b|\/ofsc\/verde\b|\bVD[_-]/i.test(texto)) hits.add("verde");
  if (hits.size === 1) return [...hits][0]!;
  if (hits.size > 1) return "*";
  return null;
}

function semearOfsc(db: DatabaseSync): void {
  const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ofsc_recursos'").get() as
    | { name: string }
    | undefined;
  if (!tabelas) return;
  const existente = db.prepare("SELECT COUNT(*) AS total FROM ofsc_recursos").get() as { total: number } | undefined;
  if (existente && existente.total > 0) return;
  const equipas = db.prepare("SELECT id FROM equipas").all() as { id: string }[];
  const operadores = ["azul", "vermelho", "verde"] as const;
  for (const operador of operadores) {
    db.prepare("INSERT OR IGNORE INTO ofsc_saude (operador_id, em_baixo) VALUES (?, 0)").run(operador);
    for (const equipa of equipas) {
      const codigo = equipa.id.replace(/^eq-/, "").toUpperCase();
      const prefixo = operador === "azul" ? "AZ" : operador === "vermelho" ? "VR" : "VD";
      db.prepare("INSERT OR IGNORE INTO ofsc_recursos (resource_id, operador_id, equipa_id) VALUES (?, ?, ?)").run(
        `${prefixo}_RES_${codigo}`,
        operador,
        equipa.id,
      );
    }
  }
}

function hashPalavra(palavra: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(palavra, sal, 32).toString("hex");
  return `scrypt$${sal}$${hash}`;
}

export function verificarPalavra(palavra: string, guardado: string): boolean {
  const partes = guardado.split("$");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;
  const calculado = scryptSync(palavra, partes[1], 32);
  const existente = Buffer.from(partes[2], "hex");
  if (calculado.length !== existente.length) return false;
  return timingSafeEqual(calculado, existente);
}

function semear(db: DatabaseSync): void {
  const existente = db.prepare("SELECT COUNT(*) AS total FROM operadores").get() as { total: number } | undefined;
  if (existente && existente.total > 0) return;
  const mundo = criarMundoDemonstracao();
  db.exec("BEGIN");
  try {
    for (const operador of OPERADORES_DEMO) {
      db.prepare("INSERT INTO operadores (id, nome, cor, horizonte_dias) VALUES (?, ?, ?, ?)").run(
        operador.id,
        operador.nome,
        operador.cor,
        operador.horizonteDias,
      );
    }
    for (const regiao of regioesDemonstracao()) {
      db.prepare("INSERT INTO regioes (id, nome) VALUES (?, ?)").run(regiao.id, regiao.nome);
    }
    for (const zona of zonasDemonstracao()) {
      db.prepare("INSERT INTO zonas (id, regiao_id, codigo, nome) VALUES (?, ?, ?, ?)").run(
        zona.id,
        zona.regiaoId,
        zona.codigo,
        zona.nome,
      );
    }
    for (const cco of ccosDemonstracao()) {
      db.prepare("INSERT INTO ccos (id, nome) VALUES (?, ?)").run(cco.id, cco.nome);
    }
    for (const equipa of mundo.equipas) {
      db.prepare("INSERT INTO equipas (id, codigo, nome, cco_id, base, areas, ativa) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        equipa.id,
        equipa.codigo,
        equipa.nome,
        EQUIPA_CCO[equipa.id],
        equipa.base,
        JSON.stringify(equipa.areas),
        equipa.ativa ? 1 : 0,
      );
      for (const competencia of equipa.competencias) {
        db.prepare(
          "INSERT INTO competencias (equipa_id, operador_id, categorias, tecnologias) VALUES (?, ?, ?, ?)",
        ).run(
          equipa.id,
          competencia.operadorId,
          JSON.stringify(competencia.categorias),
          JSON.stringify(competencia.tecnologias),
        );
      }
      for (const horario of equipa.horarios) {
        db.prepare("INSERT INTO horarios (id, equipa_id, dia_semana, inicio, fim) VALUES (?, ?, ?, ?, ?)").run(
          `hor-${equipa.id}-${horario.diaSemana}`,
          equipa.id,
          horario.diaSemana,
          horario.inicio,
          horario.fim,
        );
      }
      for (const bloco of equipa.indisponibilidades) {
        db.prepare(
          "INSERT INTO indisponibilidades (id, equipa_id, data, inicio, fim, motivo) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(bloco.id, equipa.id, bloco.data, bloco.inicio, bloco.fim, bloco.motivo);
      }
    }
    for (const vigencia of vigenciasDemonstracao()) {
      db.prepare("INSERT INTO equipa_zona (id, equipa_id, zona_id, inicio, fim) VALUES (?, ?, ?, ?, ?)").run(
        vigencia.id,
        vigencia.equipaId,
        vigencia.zonaId,
        vigencia.inicio,
        vigencia.fim,
      );
    }
    for (const tecnico of tecnicosDemonstracao()) {
      db.prepare("INSERT INTO tecnicos (id, equipa_id, nome, ativo) VALUES (?, ?, ?, 1)").run(
        tecnico.id,
        tecnico.equipaId,
        tecnico.nome,
      );
    }
    for (const utilizador of utilizadoresDemonstracao()) {
      db.prepare(
        "INSERT INTO utilizadores (id, nome, email, palavra_passe_hash, papel, operador_id, tecnico_id, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      ).run(
        utilizador.id,
        utilizador.nome,
        utilizador.email,
        hashPalavra(utilizador.palavraPasse),
        utilizador.papel,
        utilizador.operadorId,
        utilizador.tecnicoId,
      );
    }
    const agora = "2026-10-26T08:00:00.000Z";
    for (const ordem of mundo.ordens) {
      inserirOrdem(db, ordem, null, agora);
    }
    for (const evento of historicoDemonstracao()) {
      db.prepare(
        "INSERT INTO historico_ordens (id, ordem_id, quando, utilizador_id, acao, detalhe) VALUES (?, ?, ?, NULL, ?, ?)",
      ).run(evento.id, evento.ordemId, evento.quando, evento.acao, evento.detalhe);
    }
    db.prepare("INSERT INTO definicoes (chave, valor) VALUES ('margem_deslocacao_min', '15')").run();
    db.prepare("INSERT INTO definicoes (chave, valor) VALUES ('segredo_plano', ?)").run(randomBytes(32).toString("hex"));
    db.prepare("INSERT INTO auditoria (id, quando, utilizador_id, acao, detalhe) VALUES (?, ?, NULL, ?, ?)").run(
      "aud-semente",
      agora,
      "semente",
      "Base de demonstração criada.",
    );
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

function inserirOrdem(db: DatabaseSync, ordem: Ordem, criadaPor: string | null, criadaEm: string): void {
  db.prepare(
    `INSERT INTO ordens (
      id, operador_id, referencia, area, zona_id, equipa_id, categoria, tecnologia, data,
      janela_inicio, janela_fim, duracao_min, prioridade, estado, inicio_planeado, fim_planeado,
      inicio_fixado, cliente_nome, cliente_contacto, morada, nota, motivo_cancelamento, quem_pediu,
      criada_por, criada_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    ordem.id,
    ordem.operadorId,
    ordem.referencia,
    ordem.area,
    ordem.zonaId,
    ordem.equipaId,
    ordem.categoria,
    ordem.tecnologia,
    ordem.data,
    ordem.janelaInicio,
    ordem.janelaFim,
    ordem.duracaoMin,
    ordem.prioridade,
    ordem.estado,
    ordem.inicioPlaneado,
    ordem.fimPlaneado,
    ordem.inicioFixado ? 1 : 0,
    ordem.clienteNome,
    ordem.clienteContacto,
    ordem.morada,
    ordem.nota,
    ordem.motivoCancelamento,
    ordem.quemPediu,
    criadaPor,
    criadaEm,
  );
}

export function transacao(trabalho: () => void): void {
  const db = baseDados();
  db.exec("BEGIN");
  try {
    trabalho();
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

export function lerMundo(): Mundo {
  const db = baseDados();
  const margem = db.prepare("SELECT valor FROM definicoes WHERE chave = 'margem_deslocacao_min'").get() as
    | { valor: string }
    | undefined;
  const equipasRows = db.prepare("SELECT * FROM equipas ORDER BY nome").all() as Record<string, string | number>[];
  const competencias = db.prepare("SELECT * FROM competencias").all() as Record<string, string>[];
  const horarios = db.prepare("SELECT * FROM horarios").all() as Record<string, string | number>[];
  const indisponibilidades = db.prepare("SELECT * FROM indisponibilidades").all() as Record<string, string>[];
  const ordens = db.prepare("SELECT * FROM ordens").all() as Record<string, string | number | null>[];

  const equipas: Equipa[] = equipasRows.map((linha) => ({
    id: String(linha.id),
    codigo: String(linha.codigo),
    nome: String(linha.nome),
    base: String(linha.base),
    areas: JSON.parse(String(linha.areas)) as string[],
    ativa: Number(linha.ativa) === 1,
    competencias: competencias
      .filter((competencia) => competencia.equipa_id === linha.id)
      .map((competencia) => ({
        operadorId: competencia.operador_id as OperadorId,
        categorias: JSON.parse(competencia.categorias) as Categoria[],
        tecnologias: JSON.parse(competencia.tecnologias) as Tecnologia[],
      })),
    horarios: horarios
      .filter((horario) => horario.equipa_id === linha.id)
      .map((horario) => ({
        diaSemana: Number(horario.dia_semana),
        inicio: String(horario.inicio),
        fim: String(horario.fim),
      })),
    indisponibilidades: indisponibilidades
      .filter((bloco) => bloco.equipa_id === linha.id)
      .map((bloco) => ({
        id: bloco.id,
        data: bloco.data,
        inicio: bloco.inicio,
        fim: bloco.fim,
        motivo: bloco.motivo,
      })),
  }));

  return {
    margemDeslocacaoMin: Number(margem?.valor ?? 15),
    equipas,
    ordens: ordens.map(ordemDeLinha),
  };
}

export function ordemDeLinha(linha: Record<string, string | number | null>): Ordem {
  return {
    id: String(linha.id),
    operadorId: String(linha.operador_id) as OperadorId,
    referencia: String(linha.referencia),
    area: String(linha.area),
    zonaId: String(linha.zona_id),
    equipaId: linha.equipa_id ? String(linha.equipa_id) : null,
    categoria: String(linha.categoria) as Ordem["categoria"],
    tecnologia: linha.tecnologia ? (String(linha.tecnologia) as Ordem["tecnologia"]) : null,
    data: String(linha.data),
    janelaInicio: String(linha.janela_inicio),
    janelaFim: String(linha.janela_fim),
    duracaoMin: Number(linha.duracao_min),
    prioridade: String(linha.prioridade) as Ordem["prioridade"],
    estado: String(linha.estado) as Ordem["estado"],
    inicioPlaneado: linha.inicio_planeado ? String(linha.inicio_planeado) : null,
    fimPlaneado: linha.fim_planeado ? String(linha.fim_planeado) : null,
    inicioFixado: Number(linha.inicio_fixado) === 1,
    clienteNome: String(linha.cliente_nome),
    clienteContacto: String(linha.cliente_contacto),
    morada: String(linha.morada),
    nota: String(linha.nota ?? ""),
    motivoCancelamento: linha.motivo_cancelamento ? String(linha.motivo_cancelamento) : null,
    quemPediu: linha.quem_pediu ? (String(linha.quem_pediu) as Ordem["quemPediu"]) : null,
  };
}

function assinatura(ordem: Ordem): string {
  return JSON.stringify([
    ordem.equipaId,
    ordem.estado,
    ordem.data,
    ordem.janelaInicio,
    ordem.janelaFim,
    ordem.inicioPlaneado,
    ordem.fimPlaneado,
    ordem.inicioFixado,
    ordem.duracaoMin,
    ordem.motivoCancelamento,
    ordem.quemPediu,
    ordem.prioridade,
    ordem.nota,
    ordem.clienteNome,
    ordem.clienteContacto,
    ordem.morada,
    ordem.area,
    ordem.zonaId,
  ]);
}

export function sincronizarMundo(antes: Mundo, depois: Mundo, utilizadorId: string | null): string[] {
  const db = baseDados();
  const alteradas: string[] = [];
  if (antes.margemDeslocacaoMin !== depois.margemDeslocacaoMin) {
    db.prepare("UPDATE definicoes SET valor = ? WHERE chave = 'margem_deslocacao_min'").run(String(depois.margemDeslocacaoMin));
  }
  const agora = new Date().toISOString();
  for (const ordem of depois.ordens) {
    const anterior = antes.ordens.find((linha) => linha.id === ordem.id);
    if (!anterior) {
      inserirOrdem(db, ordem, utilizadorId, agora);
      alteradas.push(ordem.id);
      continue;
    }
    if (assinatura(anterior) === assinatura(ordem)) continue;
    db.prepare(
      `UPDATE ordens SET equipa_id = ?, estado = ?, data = ?, janela_inicio = ?, janela_fim = ?,
        inicio_planeado = ?, fim_planeado = ?, inicio_fixado = ?, duracao_min = ?, motivo_cancelamento = ?,
        quem_pediu = ?, prioridade = ?, nota = ?, cliente_nome = ?, cliente_contacto = ?, morada = ?, area = ?, zona_id = ?
       WHERE id = ?`,
    ).run(
      ordem.equipaId,
      ordem.estado,
      ordem.data,
      ordem.janelaInicio,
      ordem.janelaFim,
      ordem.inicioPlaneado,
      ordem.fimPlaneado,
      ordem.inicioFixado ? 1 : 0,
      ordem.duracaoMin,
      ordem.motivoCancelamento,
      ordem.quemPediu,
      ordem.prioridade,
      ordem.nota,
      ordem.clienteNome,
      ordem.clienteContacto,
      ordem.morada,
      ordem.area,
      ordem.zonaId,
      ordem.id,
    );
    alteradas.push(ordem.id);
  }
  for (const equipa of depois.equipas) {
    const anterior = antes.equipas.find((linha) => linha.id === equipa.id);
    if (!anterior) continue;
    if (JSON.stringify(anterior.indisponibilidades) === JSON.stringify(equipa.indisponibilidades)) continue;
    db.prepare("DELETE FROM indisponibilidades WHERE equipa_id = ?").run(equipa.id);
    for (const bloco of equipa.indisponibilidades) {
      db.prepare(
        "INSERT INTO indisponibilidades (id, equipa_id, data, inicio, fim, motivo) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(bloco.id, equipa.id, bloco.data, bloco.inicio, bloco.fim, bloco.motivo);
    }
  }
  return alteradas;
}

export function registarHistorico(ordemId: string, utilizadorId: string | null, acao: string, detalhe: string): void {
  baseDados()
    .prepare(
      "INSERT INTO historico_ordens (id, ordem_id, quando, utilizador_id, acao, detalhe) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(`his-${crypto.randomUUID()}`, ordemId, new Date().toISOString(), utilizadorId, acao, detalhe);
}

export function registarAuditoria(utilizadorId: string | null, acao: string, detalhe: string): void {
  baseDados()
    .prepare("INSERT INTO auditoria (id, quando, utilizador_id, acao, detalhe) VALUES (?, ?, ?, ?, ?)")
    .run(`aud-${crypto.randomUUID()}`, new Date().toISOString(), utilizadorId, acao, detalhe);
}

export function selarImpressao(impressao: string): string {
  const linha = baseDados().prepare("SELECT valor FROM definicoes WHERE chave = 'segredo_plano'").get() as
    | { valor: string }
    | undefined;
  return createHmac("sha256", linha?.valor ?? "demonstracao").update(impressao).digest("hex");
}

export function definirMargem(minutos: number): void {
  baseDados().prepare("UPDATE definicoes SET valor = ? WHERE chave = 'margem_deslocacao_min'").run(String(minutos));
}
