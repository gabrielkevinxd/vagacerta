export const IDIOMAS = ["pt-PT", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_OMISSAO: Idioma = "pt-PT";
export const COOKIE_IDIOMA = "vc_idioma";
export const COOKIE_SESSAO = "vc_sessao";

export function eIdioma(valor: unknown): valor is Idioma {
  return valor === "pt-PT" || valor === "en";
}

export type Folhas<T, P extends string = ""> = T extends string
  ? P
  : {
      [K in keyof T & string]: Folhas<T[K], P extends "" ? K : `${P}.${K}`>;
    }[keyof T & string];
