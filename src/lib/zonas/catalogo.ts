import adjacenciaJson from "../../../data/zonas/adjacencia.json";
import coberturaJson from "../../../data/zonas/cobertura-dstelecom.json";
import municipiosJson from "../../../data/zonas/municipios-caop.json";

export interface MunicipioCatalogo {
  dicofre: string;
  nome: string;
  distrito: string;
  nuts2: string;
  nuts3: string;
  cobertura: string | null;
  fonteCobertura: string | null;
}

const municipios = (municipiosJson as { municipios: MunicipioCatalogo[] }).municipios;
const vizinhos = (adjacenciaJson as { vizinhos: Record<string, string[]> }).vizinhos;
const demoAreas = (coberturaJson as { demoAreasParaDicofre: Record<string, string> }).demoAreasParaDicofre;

const porDicofre = new Map(municipios.map((m) => [m.dicofre, m]));
const porNome = new Map(municipios.map((m) => [m.nome, m]));

/** Municípios com cobertura catalogada (RNG + demo-seed). */
export function municipiosComCobertura(): MunicipioCatalogo[] {
  return municipios.filter((m) => Boolean(m.cobertura));
}

export function municipioPorDicofre(dicofre: string): MunicipioCatalogo | undefined {
  return porDicofre.get(dicofre);
}

export function municipioPorNome(nome: string): MunicipioCatalogo | undefined {
  return porNome.get(nome);
}

export function dicofreDaArea(area: string): string | undefined {
  return demoAreas[area] ?? porNome.get(area)?.dicofre;
}

export function nomeDoDicofre(dicofre: string): string | undefined {
  return porDicofre.get(dicofre)?.nome;
}

export function vizinhosDe(dicofre: string): string[] {
  return vizinhos[dicofre] ?? [];
}

/** Conjunto conexo na adjacência CAOP (só as arestas do grafo completo). */
export function conjuntoConexo(dicofres: readonly string[]): boolean {
  if (dicofres.length <= 1) return true;
  const alvo = new Set(dicofres);
  const inicio = dicofres[0]!;
  const vistos = new Set<string>([inicio]);
  const fila = [inicio];
  while (fila.length > 0) {
    const atual = fila.pop()!;
    for (const vizinho of vizinhosDe(atual)) {
      if (!alvo.has(vizinho) || vistos.has(vizinho)) continue;
      vistos.add(vizinho);
      fila.push(vizinho);
    }
  }
  return vistos.size === alvo.size;
}

export function regioesPorNuts2(): { id: string; nome: string }[] {
  const nomes = [...new Set(municipiosComCobertura().map((m) => m.nuts2))].sort((a, b) => a.localeCompare(b, "pt"));
  return nomes.map((nome) => ({
    id: `rg-${nome
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`,
    nome,
  }));
}

export function ccoParaDistrito(distrito: string): string {
  const chave = distrito
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `cco-${chave}`;
}

/** Nomes oficiais das 92 áreas com cobertura — válidos em ordens/equipas. */
export function nomesAreasCobertura(): string[] {
  return municipiosComCobertura()
    .map((m) => m.nome)
    .sort((a, b) => a.localeCompare(b, "pt"));
}

export { demoAreas as DEMO_AREA_PARA_DICOFRE };
