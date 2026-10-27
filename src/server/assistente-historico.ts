import "server-only";

import { baseDados } from "./db";

const LIMITE = 6;

export type LinhaHistoricoAssistente = {
  papel: "utilizador" | "assistente";
  texto: string;
  /** Legenda IA/regras; só nas respostas do assistente. */
  origem?: string;
};

/** Histórico do assistente por sessão (não por utilizador — contas partilhadas não misturam). */
export function lerHistoricoAssistente(sessaoToken: string): LinhaHistoricoAssistente[] {
  const linhas = baseDados()
    .prepare(
      `SELECT papel, texto, origem FROM assistente_historico
       WHERE sessao_token = ?
       ORDER BY seq ASC`,
    )
    .all(sessaoToken) as { papel: string; texto: string; origem: string | null }[];
  return linhas
    .filter((linha) => linha.papel === "utilizador" || linha.papel === "assistente")
    .map((linha) => ({
      papel: linha.papel as "utilizador" | "assistente",
      texto: linha.texto.slice(0, 400),
      ...(linha.origem ? { origem: linha.origem } : {}),
    }))
    .slice(-LIMITE);
}

export function acrescentarHistoricoAssistente(
  sessaoToken: string,
  papel: "utilizador" | "assistente",
  texto: string,
  origem?: string,
): void {
  const limpo = texto.trim().slice(0, 800);
  if (!limpo) return;
  const db = baseDados();
  const em = new Date().toISOString();
  const origemLimpa = origem?.trim().slice(0, 200) || null;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO assistente_historico (sessao_token, papel, texto, em, origem) VALUES (?, ?, ?, ?, ?)`,
    ).run(sessaoToken, papel, limpo, em, papel === "assistente" ? origemLimpa : null);

    const ids = db
      .prepare(
        `SELECT seq FROM assistente_historico WHERE sessao_token = ? ORDER BY seq DESC`,
      )
      .all(sessaoToken) as { seq: number }[];
    if (ids.length > LIMITE) {
      const apagar = db.prepare(`DELETE FROM assistente_historico WHERE seq = ?`);
      for (const linha of ids.slice(LIMITE)) apagar.run(linha.seq);
    }
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

export function limparHistoricoAssistente(sessaoToken: string): void {
  baseDados().prepare(`DELETE FROM assistente_historico WHERE sessao_token = ?`).run(sessaoToken);
}
