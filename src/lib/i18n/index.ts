import { en } from "./en";
import { interpolar, valorEm } from "./folhas";
import { ptPT, type Mensagens } from "./pt-PT";
import { IDIOMA_OMISSAO, type Folhas, type Idioma } from "./tipos";

export type { Mensagens };
export type { Idioma };
export type Chave = Folhas<Mensagens>;
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

export function t(mensagens: Mensagens, chave: Chave, vars?: Record<string, string | number>): string {
  const valor = valorEm(mensagens, chave);
  if (typeof valor !== "string") return chave;
  return interpolar(valor, vars);
}

export function traduzir(idioma: Idioma, chave: Chave, vars?: Record<string, string | number>): string {
  return t(mensagensDe(idioma), chave, vars);
}
