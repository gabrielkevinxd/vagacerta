import { en } from "./en";
import { interpolar, valorEm } from "./folhas";
import { BASES_PLURAIS } from "./plurais";
import { ptPT, type Mensagens } from "./pt-PT";
import { IDIOMA_OMISSAO, type Folhas, type Idioma } from "./tipos";

export type { Mensagens };
export type { Idioma };
export type Chave = Folhas<Mensagens>;
/** Base de uma chave `_um`/`_outros` (ex.: `assistente.verAlertas`). */
export type BasePlural = {
  [K in Chave]: K extends `${infer B}_um` ? B : never;
}[Chave];
export type ChavePlural = `${BasePlural}_um` | `${BasePlural}_outros`;
export type ChaveLeitura = Chave | BasePlural;
export { BASES_PLURAIS, listarBasesPlurais } from "./plurais";
export { COOKIE_IDIOMA, COOKIE_SESSAO, IDIOMA_OMISSAO, IDIOMAS, eIdioma } from "./tipos";
export { folhasDe } from "./folhas";
export { ptPT } from "./pt-PT";
export { en } from "./en";

const CATALOGO: Record<Idioma, Mensagens> = {
  "pt-PT": ptPT,
  en,
};

export function mensagensDe(idioma: Idioma): Mensagens {
  return CATALOGO[idioma] ?? CATALOGO[IDIOMA_OMISSAO];
}

export function idiomaDe(mensagens: Mensagens): Idioma {
  return mensagens === en ? "en" : "pt-PT";
}

export function eBasePlural(chave: string): chave is BasePlural {
  return BASES_PLURAIS.includes(chave);
}

/** Categoria `um` / `outros` via Intl.PluralRules (pt-PT e en). */
export function sufixoPlural(idioma: Idioma, n: number): "um" | "outros" {
  const categoria = new Intl.PluralRules(idioma === "en" ? "en" : "pt-PT").select(n);
  return categoria === "one" ? "um" : "outros";
}

export function t(mensagens: Mensagens, chave: Chave, vars?: Record<string, string | number>): string {
  const valor = valorEm(mensagens, chave);
  if (typeof valor !== "string") return chave;
  return interpolar(valor, vars);
}

function chavePluralResolvida(chaveBase: BasePlural, n: number, idioma: Idioma): Chave {
  const candidata = `${chaveBase}_${sufixoPlural(idioma, n)}`;
  const valor = valorEm(mensagensDe(idioma), candidata);
  if (typeof valor !== "string") {
    throw new Error(`Chave plural em falta: ${candidata}`);
  }
  return candidata as ChavePlural & Chave;
}

/**
 * Traduz uma chave com variantes `_um` / `_outros` escolhidas por Intl.PluralRules.
 * Ex.: `tp(m, "assistente.contagem.pendentes", 1)` → `assistente.contagem.pendentes_um`.
 */
export function tp(
  mensagens: Mensagens,
  chaveBase: BasePlural,
  n: number,
  vars?: Record<string, string | number>,
): string {
  return t(mensagens, chavePluralResolvida(chaveBase, n, idiomaDe(mensagens)), { n, ...vars });
}

export function traduzir(idioma: Idioma, chave: Chave, vars?: Record<string, string | number>): string {
  return t(mensagensDe(idioma), chave, vars);
}
