import { en } from "./en";
import { interpolar, valorEm } from "./folhas";
import { type BasePlural, type ChavePlural } from "./plurais";
import { ptPT, type Mensagens } from "./pt-PT";
import { IDIOMA_OMISSAO, type Folhas, type Idioma } from "./tipos";

export type { Mensagens };
export type { Idioma };
export type Chave = Folhas<Mensagens>;
export type { BasePlural, ChavePlural, ChaveLeitura } from "./plurais";
export { BASES_PLURAIS, eBasePlural } from "./plurais";
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
  const resolvida: ChavePlural = `${chaveBase}_${sufixoPlural(idioma, n)}`;
  // ChavePlural ⊆ Chave (variantes existem no catálogo pt/en).
  return resolvida as Chave;
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
