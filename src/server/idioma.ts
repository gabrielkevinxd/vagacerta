import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { COOKIE_IDIOMA, eIdioma, IDIOMA_OMISSAO, mensagensDe, t, type Chave, type Idioma, type Mensagens } from "@/lib/i18n";
import { baseDados } from "./db";

const armazenamento = new AsyncLocalStorage<Idioma>();

export function idiomaAtual(): Idioma {
  return armazenamento.getStore() ?? IDIOMA_OMISSAO;
}

export function comIdioma<T>(idioma: Idioma, trabalho: () => T): T {
  return armazenamento.run(idioma, trabalho);
}

export async function comIdiomaAsync<T>(idioma: Idioma, trabalho: () => Promise<T>): Promise<T> {
  return armazenamento.run(idioma, trabalho);
}

export function mensagensAtuais(): Mensagens {
  return mensagensDe(idiomaAtual());
}

export async function lerIdiomaPedido(): Promise<Idioma> {
  const jar = await cookies();
  const doCookie = jar.get(COOKIE_IDIOMA)?.value;
  if (eIdioma(doCookie)) return doCookie;
  return IDIOMA_OMISSAO;
}

export async function gravarIdioma(idioma: Idioma, utilizadorId?: string | null): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_IDIOMA, idioma, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  if (utilizadorId) {
    baseDados().prepare("UPDATE utilizadores SET idioma = ? WHERE id = ?").run(idioma, utilizadorId);
  }
}

export async function i18nPedido() {
  const idioma = await lerIdiomaPedido();
  const m = mensagensDe(idioma);
  return {
    idioma,
    m,
    t: (chave: Chave, vars?: Record<string, string | number>) => t(m, chave, vars),
  };
}

export function idiomaDoUtilizador(utilizadorId: string): Idioma | null {
  const linha = baseDados().prepare("SELECT idioma FROM utilizadores WHERE id = ?").get(utilizadorId) as
    | { idioma?: string }
    | undefined;
  return eIdioma(linha?.idioma) ? linha.idioma : null;
}
