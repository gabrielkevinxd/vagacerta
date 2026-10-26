import { SEMENTE_GEMEO, type MetricasPolitica, type RelatorioGemeo } from "@/lib/contratos/gemeo";
import { traduzir, type Idioma } from "@/lib/i18n";
import { formatarPercentagem } from "@/lib/i18n/formatacao";
import { limparCacheViabilidade } from "@/lib/rules/viabilidade";
import { diaSemanaIso, somarDias } from "@/lib/rules/tempo";
import { avaliarMundo, type BaldeDia, type CorridaPolitica } from "./avaliar";
import { FROTA_GEMEO } from "./frota";
import { gerarMundo } from "./gerar";
import { INICIO_HORIZONTE, PEDIDO_OMISSAO, type PedidoSimulacao } from "./pedido";
import type { Equipa } from "@/lib/rules/tipos";
import { misturarSemente, mulberry32 } from "./rng";
import type { PoliticaId } from "@/lib/contratos/gemeo";

export function datasUteis(inicio: string, semanas: number): string[] {
  const datas: string[] = [];
  for (let offset = 0; offset < semanas * 7; offset += 1) {
    const data = somarDias(inicio, offset);
    if (diaSemanaIso(data) <= 5) datas.push(data);
  }
  return datas;
}

function razao(parte: number, todo: number): number {
  return todo === 0 ? 0 : parte / todo;
}

function baldeVazio(): BaldeDia {
  return { aceites: 0, recusadas: 0, sobreReservas: 0, minutosOcupados: 0, minutosOciosos: 0, minutosCapacidade: 0 };
}

function somarBalde(alvo: BaldeDia, extra: BaldeDia) {
  alvo.aceites += extra.aceites;
  alvo.recusadas += extra.recusadas;
  alvo.sobreReservas += extra.sobreReservas;
  alvo.minutosOcupados += extra.minutosOcupados;
  alvo.minutosOciosos += extra.minutosOciosos;
  alvo.minutosCapacidade += extra.minutosCapacidade;
}

function paraMetrica(id: PoliticaId, corrida: BaldeDia, evitadas: number): MetricasPolitica {
  return {
    id,
    aceites: corrida.aceites,
    recusadas: corrida.recusadas,
    sobreReservas: corrida.sobreReservas,
    sobreReservasEvitadas: evitadas,
    minutosOcupados: corrida.minutosOcupados,
    minutosOciosos: corrida.minutosOciosos,
    minutosCapacidade: corrida.minutosCapacidade,
    utilizacao: razao(corrida.minutosOcupados, corrida.minutosCapacidade),
  };
}

function notaDe(pedido: PedidoSimulacao, politicas: MetricasPolitica[], geradas: number, idioma: Idioma): string {
  const independente = politicas.find((linha) => linha.id === "independente")!;
  const partilhada = politicas.find((linha) => linha.id === "partilhada")!;
  const reencaixe = politicas.find((linha) => linha.id === "reencaixe")!;
  return traduzir(idioma, "gemeo.nota", {
    semente: pedido.semente,
    replicas: pedido.replicas,
    semanas: pedido.semanas,
    geradas,
    srInd: independente.sobreReservas,
    utilInd: formatarPercentagem(independente.utilizacao, idioma),
    recPart: partilhada.recusadas,
    evit: partilhada.sobreReservasEvitadas,
    extra: reencaixe.aceites - partilhada.aceites,
    ociosoPart: partilhada.minutosOciosos,
    ociosoRe: reencaixe.minutosOciosos,
  });
}

export function correrSimulacao(
  pedido: PedidoSimulacao = PEDIDO_OMISSAO,
  idioma: Idioma = "pt-PT",
  frota: Equipa[] = FROTA_GEMEO,
): RelatorioGemeo {
  const datas = datasUteis(INICIO_HORIZONTE, pedido.semanas);
  const totais: Record<PoliticaId, BaldeDia> = {
    independente: baldeVazio(),
    partilhada: baldeVazio(),
    reencaixe: baldeVazio(),
  };
  const diario = new Map<string, Record<PoliticaId, BaldeDia>>();
  for (const data of datas) {
    diario.set(data, { independente: baldeVazio(), partilhada: baldeVazio(), reencaixe: baldeVazio() });
  }
  const aceitesOperador = {
    independente: { azul: 0, vermelho: 0, verde: 0 },
    partilhada: { azul: 0, vermelho: 0, verde: 0 },
  };
  let geradas = 0;

  for (let replica = 0; replica < pedido.replicas; replica += 1) {
    const mundo = gerarMundo(mulberry32(misturarSemente(pedido.semente, replica)), pedido, datas, frota);
    geradas += mundo.chegadas.length;
    const corridas = avaliarMundo(mundo);
    for (const id of ["independente", "partilhada", "reencaixe"] as const) {
      const corrida: CorridaPolitica = corridas[id];
      somarBalde(totais[id], {
        aceites: corrida.aceites,
        recusadas: corrida.recusadas,
        sobreReservas: corrida.sobreReservas,
        minutosOcupados: corrida.minutosOcupados,
        minutosOciosos: corrida.minutosOciosos,
        minutosCapacidade: corrida.minutosCapacidade,
      });
      for (const data of datas) {
        const balde = corrida.diario.get(data);
        if (balde) somarBalde(diario.get(data)![id], balde);
      }
    }
    for (const operador of ["azul", "vermelho", "verde"] as const) {
      aceitesOperador.independente[operador] += corridas.independente.porOperador.get(operador) ?? 0;
      aceitesOperador.partilhada[operador] += corridas.partilhada.porOperador.get(operador) ?? 0;
    }
  }

  limparCacheViabilidade();

  const politicas = (["independente", "partilhada", "reencaixe"] as const).map((id) =>
    paraMetrica(id, totais[id], Math.max(0, totais.independente.sobreReservas - totais[id].sobreReservas)),
  );

  const serieDiaria = datas.map((data) => {
    const linha = diario.get(data)!;
    const partilhada = linha.partilhada;
    return {
      data,
      utilizacao: razao(partilhada.minutosOcupados, partilhada.minutosCapacidade),
      recusadas: partilhada.recusadas,
      sobreReservasEvitadas: Math.max(0, linha.independente.sobreReservas - partilhada.sobreReservas),
    };
  });

  return {
    semente: pedido.semente,
    replicas: pedido.replicas,
    semanas: pedido.semanas,
    ordensGeradas: geradas,
    politicas,
    serieDiaria,
    nota: notaDe(pedido, politicas, geradas, idioma),
    comparacao: (["azul", "vermelho", "verde"] as const).map((operadorId) => ({
      operadorId,
      aceitesPartilhadas: aceitesOperador.partilhada[operadorId],
      aceitesIndependentes: aceitesOperador.independente[operadorId],
    })),
  };
}

export { SEMENTE_GEMEO };
