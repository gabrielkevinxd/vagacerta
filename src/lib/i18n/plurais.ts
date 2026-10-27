import { folhasDe } from "./folhas";
import { ptPT } from "./pt-PT";

/** Bases com `_um`/`_outros` derivadas do catálogo pt-PT (não lista manual). */
export function listarBasesPlurais(catalogo: unknown = ptPT): string[] {
  const folhas = folhasDe(catalogo);
  const bases = new Set<string>();
  for (const folha of folhas) {
    if (folha.endsWith("_um")) bases.add(folha.slice(0, -3));
  }
  return [...bases].sort();
}

export const BASES_PLURAIS: readonly string[] = listarBasesPlurais();
