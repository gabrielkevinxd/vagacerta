import "server-only";

import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { COOKIE_IDIOMA, COOKIE_SESSAO, eIdioma } from "@/lib/i18n";
import type { Ator, Papel } from "@/lib/rules";
import { limparHistoricoAssistente } from "./assistente-historico";
import { baseDados, verificarPalavra } from "./db";
import { sessaoViva } from "./sessao-viva";

const COOKIE = COOKIE_SESSAO;

function cookieSeguro(): boolean {
  return process.env.VC_HTTPS === "1";
}
const INATIVIDADE_MS = 8 * 60 * 60 * 1000;

interface LinhaAtor {
  id: string;
  nome: string;
  papel: Papel;
  operador_id: string | null;
  tecnico_id: string | null;
  equipa_id: string | null;
  expira_em?: string;
  ativo?: number;
}

function paraAtor(linha: LinhaAtor): Ator {
  return {
    id: linha.id,
    nome: linha.nome,
    papel: linha.papel,
    operadorId: (linha.operador_id as Ator["operadorId"]) ?? null,
    tecnicoId: linha.tecnico_id,
    equipaId: linha.equipa_id,
  };
}

export async function obterAtor(): Promise<Ator | null> {
  await connection();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  if (!sessaoViva(token)) return null;
  const linha = baseDados()
    .prepare(
      `SELECT u.id, u.nome, u.papel, u.operador_id, u.tecnico_id, u.ativo, t.equipa_id, s.expira_em
       FROM sessoes s
       JOIN utilizadores u ON u.id = s.utilizador_id
       LEFT JOIN tecnicos t ON t.id = u.tecnico_id
       WHERE s.token = ?`,
    )
    .get(token) as LinhaAtor | undefined;
  if (!linha || Number(linha.ativo) !== 1) return null;
  if (new Date(String(linha.expira_em)).getTime() < Date.now()) {
    baseDados().prepare("DELETE FROM sessoes WHERE token = ?").run(token);
    return null;
  }
  baseDados()
    .prepare("UPDATE sessoes SET expira_em = ? WHERE token = ?")
    .run(new Date(Date.now() + INATIVIDADE_MS).toISOString(), token);
  return paraAtor(linha);
}

export async function exigirAtorPagina(): Promise<Ator> {
  const ator = await obterAtor();
  if (!ator) redirect("/entrar");
  return ator;
}

export async function entrar(email: string, palavraPasse: string): Promise<Ator | null> {
  const linha = baseDados()
    .prepare(
      `SELECT u.id, u.nome, u.papel, u.operador_id, u.tecnico_id, u.ativo, u.palavra_passe_hash, u.idioma, t.equipa_id
       FROM utilizadores u
       LEFT JOIN tecnicos t ON t.id = u.tecnico_id
       WHERE lower(u.email) = lower(?)`,
    )
    .get(email.trim()) as (LinhaAtor & { palavra_passe_hash: string; idioma?: string }) | undefined;
  if (!linha || Number(linha.ativo) !== 1 || !verificarPalavra(palavraPasse, linha.palavra_passe_hash)) return null;
  const token = randomBytes(32).toString("hex");
  const agora = new Date();
  baseDados()
    .prepare("INSERT INTO sessoes (token, utilizador_id, expira_em, criada_em) VALUES (?, ?, ?, ?)")
    .run(token, linha.id, new Date(agora.getTime() + INATIVIDADE_MS).toISOString(), agora.toISOString());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSeguro(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  const doCookie = jar.get(COOKIE_IDIOMA)?.value;
  if (eIdioma(doCookie)) {
    baseDados().prepare("UPDATE utilizadores SET idioma = ? WHERE id = ?").run(doCookie, linha.id);
  } else if (eIdioma(linha.idioma)) {
    jar.set(COOKIE_IDIOMA, linha.idioma, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return paraAtor(linha);
}

export async function sair(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const linha = baseDados()
      .prepare("SELECT utilizador_id AS utilizadorId FROM sessoes WHERE token = ?")
      .get(token) as { utilizadorId: string } | undefined;
    if (linha?.utilizadorId) limparHistoricoAssistente(linha.utilizadorId);
    baseDados().prepare("DELETE FROM sessoes WHERE token = ?").run(token);
  }
  jar.delete(COOKIE);
}
