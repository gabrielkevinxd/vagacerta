import { mulberry32, escolher, inteiroEntre } from "@/lib/gemeo/rng";
import { competenciasDeOperadores, OPERADORES_SERVIDOS_PADRAO } from "@/lib/rules/operadores-servidos";
import type { Equipa, OperadorId } from "@/lib/rules/tipos";
import {
  ccoParaDistrito,
  conjuntoConexo,
  municipiosComCobertura,
  nomeDoDicofre,
  regioesPorNuts2,
  vizinhosDe,
  type MunicipioCatalogo,
} from "./catalogo";

const SEMENTE_FROTA = 20261027;

function diasUteis(inicio: string, fim: string) {
  return [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio, fim }));
}

function subsetConexo(rng: () => number, inicio: string, tamanho: number, permitidos: Set<string>): string[] {
  const escolhidos = new Set<string>([inicio]);
  const fronteira = new Set(vizinhosDe(inicio).filter((id) => permitidos.has(id)));
  while (escolhidos.size < tamanho && fronteira.size > 0) {
    const opcoes = [...fronteira];
    const proximo = escolher(rng, opcoes);
    escolhidos.add(proximo);
    fronteira.delete(proximo);
    for (const vizinho of vizinhosDe(proximo)) {
      if (permitidos.has(vizinho) && !escolhidos.has(vizinho)) fronteira.add(vizinho);
    }
  }
  const lista = [...escolhidos];
  if (!conjuntoConexo(lista)) return [inicio];
  return lista;
}

/** Distribuição determinística: ~70% servem 3, ~20% servem 2, ~10% servem 1. */
function operadoresParaIndice(indice: number): OperadorId[] {
  const resto = indice % 10;
  if (resto === 0) return ["azul"];
  if (resto === 1) return ["vermelho"];
  if (resto === 2) return ["azul", "vermelho"];
  if (resto === 3) return ["azul", "verde"];
  return [...OPERADORES_SERVIDOS_PADRAO];
}

export interface EquipaSeedExtra {
  equipa: Equipa;
  zonaId: string;
  ccoId: string;
  regiaoId: string;
}

/**
 * 193 equipas extra (além das 7 de demonstração) sobre os 92 municípios com cobertura.
 * Áreas sempre conexas na adjacência CAOP. Sem operador «dono» — só `operadoresServidos`.
 */
export function gerarEquipasExtra(total = 193): EquipaSeedExtra[] {
  const rng = mulberry32(SEMENTE_FROTA);
  const ativos = municipiosComCobertura();
  const permitidos = new Set(ativos.map((m) => m.dicofre));
  const porDicofre = new Map(ativos.map((m) => [m.dicofre, m]));
  const regioes = new Map(regioesPorNuts2().map((r) => [r.nome, r.id]));
  const resultado: EquipaSeedExtra[] = [];

  // 1) Uma equipa «base» por município ativo (garante cobertura).
  for (const municipio of ativos) {
    if (resultado.length >= total) break;
    const areasDic = subsetConexo(rng, municipio.dicofre, inteiroEntre(rng, 1, 3), permitidos);
    resultado.push(montar(resultado.length, municipio, areasDic, porDicofre, regioes));
  }

  // 2) Preencher até 193 com bases aleatórias nos ativos.
  while (resultado.length < total) {
    const municipio = escolher(rng, ativos);
    const areasDic = subsetConexo(rng, municipio.dicofre, inteiroEntre(rng, 1, 3), permitidos);
    resultado.push(montar(resultado.length, municipio, areasDic, porDicofre, regioes));
  }

  return resultado;
}

function montar(
  indice: number,
  base: MunicipioCatalogo,
  areasDic: string[],
  porDicofre: Map<string, MunicipioCatalogo>,
  regioes: Map<string, string>,
): EquipaSeedExtra {
  const operadores = operadoresParaIndice(indice);
  const areas = areasDic.map((id) => nomeDoDicofre(id) ?? porDicofre.get(id)?.nome ?? id);
  const id = `eq-m${String(indice + 1).padStart(3, "0")}`;
  const codigo = `M${areasDic[0]}-${String(indice + 1).padStart(3, "0")}`;
  return {
    equipa: {
      id,
      codigo,
      nome: `Equipa ${base.nome} ${indice + 1}`,
      base: base.nome,
      areas,
      ativa: true,
      operadoresServidos: operadores,
      competencias: competenciasDeOperadores(operadores),
      horarios: diasUteis("08:00", "18:00"),
      indisponibilidades: [],
    },
    zonaId: base.dicofre,
    ccoId: ccoParaDistrito(base.distrito),
    regiaoId: regioes.get(base.nuts2) ?? "rg-norte",
  };
}

export function ccosDaFrotaExtra(extras: EquipaSeedExtra[]): { id: string; nome: string }[] {
  const vistos = new Map<string, string>();
  for (const extra of extras) {
    if (vistos.has(extra.ccoId)) continue;
    const distrito = extra.equipa.base;
    const mun = municipiosComCobertura().find((m) => m.nome === extra.equipa.base);
    vistos.set(extra.ccoId, `CCO ${mun?.distrito ?? distrito}`);
  }
  return [...vistos.entries()].map(([id, nome]) => ({ id, nome }));
}
