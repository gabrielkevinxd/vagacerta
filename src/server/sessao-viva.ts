import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { podeLerOrdem, podeVerEquipa, type Ator } from "@/lib/rules/permissoes";
import type { OperadorId, Papel } from "@/lib/rules/tipos";

// Leituras rápidas da base para o `proxy.ts`, que corre antes de qualquer página. Cada função abre e fecha
// a sua própria ligação: o proxy não partilha o processo de módulos com as rotas.

function ficheiroDaBase(): string {
  return join(process.env.VC_DATA_DIR || join(process.cwd(), "data"), "vagacerta.sqlite");
}

function comBase<T>(trabalho: (db: DatabaseSync) => T, aoFalhar: T): T {
  const ficheiro = ficheiroDaBase();
  if (!existsSync(ficheiro)) return aoFalhar;
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(ficheiro);
    return trabalho(db);
  } catch {
    return aoFalhar;
  } finally {
    db?.close();
  }
}

/** Quem tem esta sessão, se ela ainda está viva (existe, o utilizador está ativo e não expirou); senão `null`. */
export function atorDaSessao(token: string): Ator | null {
  if (!token) return null;
  return comBase((db) => {
    const linha = db
      .prepare(
        `SELECT s.expira_em, u.id, u.nome, u.papel, u.operador_id, u.tecnico_id, u.ativo, t.equipa_id
         FROM sessoes s
         JOIN utilizadores u ON u.id = s.utilizador_id
         LEFT JOIN tecnicos t ON t.id = u.tecnico_id
         WHERE s.token = ?`,
      )
      .get(token) as
      | {
          expira_em: string;
          id: string;
          nome: string;
          papel: Papel;
          operador_id: string | null;
          tecnico_id: string | null;
          ativo: number;
          equipa_id: string | null;
        }
      | undefined;
    if (!linha || Number(linha.ativo) !== 1) return null;
    if (new Date(String(linha.expira_em)).getTime() < Date.now()) return null;
    return {
      id: linha.id,
      nome: linha.nome,
      papel: linha.papel,
      operadorId: (linha.operador_id as OperadorId | null) ?? null,
      tecnicoId: linha.tecnico_id,
      equipaId: linha.equipa_id,
    };
  }, null);
}

export function sessaoViva(token: string): boolean {
  return atorDaSessao(token) !== null;
}

/** A ordem existe e este ator pode lê-la: a mesma regra (`podeLerOrdem`) que a API aplica à ficha. */
export function ordemLegivel(ator: Ator, ordemId: string): boolean {
  return comBase((db) => {
    const linha = db.prepare("SELECT operador_id, equipa_id FROM ordens WHERE id = ?").get(ordemId) as
      | { operador_id: string; equipa_id: string | null }
      | undefined;
    if (!linha) return false;
    return podeLerOrdem(ator, { operadorId: String(linha.operador_id), equipaId: linha.equipa_id ? String(linha.equipa_id) : null });
  }, false);
}

/** A equipa existe e este ator pode vê-la (o técnico só vê a sua). */
export function equipaVisivel(ator: Ator, equipaId: string): boolean {
  return comBase((db) => {
    const linha = db.prepare("SELECT id FROM equipas WHERE id = ?").get(equipaId);
    return Boolean(linha) && podeVerEquipa(ator, equipaId);
  }, false);
}
