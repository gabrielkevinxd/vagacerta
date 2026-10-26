import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function sessaoViva(token: string): boolean {
  if (!token) return false;
  const ficheiro = join(process.cwd(), "data", "vagacerta.sqlite");
  if (!existsSync(ficheiro)) return false;
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(ficheiro);
    const linha = db
      .prepare(
        `SELECT s.expira_em, u.ativo
         FROM sessoes s
         JOIN utilizadores u ON u.id = s.utilizador_id
         WHERE s.token = ?`,
      )
      .get(token) as { expira_em: string; ativo: number } | undefined;
    if (!linha || Number(linha.ativo) !== 1) return false;
    return new Date(String(linha.expira_em)).getTime() >= Date.now();
  } catch {
    return false;
  } finally {
    db?.close();
  }
}
