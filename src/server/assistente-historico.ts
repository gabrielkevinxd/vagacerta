import "server-only";

import { randomBytes } from "node:crypto";
import { baseDados } from "./db";

const LIMITE = 6;

export type LinhaHistoricoAssistente = { papel: "utilizador" | "assistente"; texto: string };

/** Histórico do assistente no servidor (não confiar no corpo enviado pelo cliente). */
export function lerHistoricoAssistente(utilizadorId: string): LinhaHistoricoAssistente[] {
  const linhas = baseDados()
    .prepare(
      `SELECT papel, texto FROM assistente_historico
       WHERE utilizador_id = ?
       ORDER BY em ASC, id ASC`,
    )
    .all(utilizadorId) as { papel: string; texto: string }[];
  return linhas
    .filter((linha) => linha.papel === "utilizador" || linha.papel === "assistente")
    .map((linha) => ({ papel: linha.papel as "utilizador" | "assistente", texto: linha.texto.slice(0, 400) }))
    .slice(-LIMITE);
}

export function acrescentarHistoricoAssistente(
  utilizadorId: string,
  papel: "utilizador" | "assistente",
  texto: string,
): void {
  const limpo = texto.trim().slice(0, 800);
  if (!limpo) return;
  const db = baseDados();
  const em = new Date().toISOString();
  db.prepare(
    `INSERT INTO assistente_historico (id, utilizador_id, papel, texto, em) VALUES (?, ?, ?, ?, ?)`,
  ).run(`ah-${randomBytes(8).toString("hex")}`, utilizadorId, papel, limpo, em);

  const ids = db
    .prepare(
      `SELECT id FROM assistente_historico WHERE utilizador_id = ? ORDER BY em DESC, id DESC`,
    )
    .all(utilizadorId) as { id: string }[];
  if (ids.length <= LIMITE) return;
  const apagar = db.prepare(`DELETE FROM assistente_historico WHERE id = ?`);
  for (const linha of ids.slice(LIMITE)) apagar.run(linha.id);
}
