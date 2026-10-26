import { diaAceita, equipaCobre, minutosDeTurno, restricoesDaEquipa, trabalhoDaOrdem } from "@/lib/rules/dia";
import { parseHHMM } from "@/lib/rules/tempo";
import { resolverSequencia } from "@/lib/rules/viabilidade";
import type { Equipa, Mundo, OperadorId, Ordem, Trabalho } from "@/lib/rules/tipos";
import type { Chegada } from "./gerar";
import type { PoliticaId } from "@/lib/contratos/gemeo";

interface TrabalhoAceite {
  chegada: Chegada;
  equipaId: string;
  sequencia: number;
}

export interface BaldeDia {
  aceites: number;
  recusadas: number;
  sobreReservas: number;
  minutosOcupados: number;
  minutosOciosos: number;
  minutosCapacidade: number;
}

export interface CorridaPolitica {
  id: PoliticaId;
  aceites: number;
  recusadas: number;
  sobreReservas: number;
  minutosOcupados: number;
  minutosOciosos: number;
  minutosCapacidade: number;
  realocacoes: number;
  diario: Map<string, BaldeDia>;
  decisoes: Map<string, "aceite" | "recusada" | "realocada">;
  porOperador: Map<OperadorId, number>;
}

function chave(equipaId: string, data: string): string {
  return `${equipaId}|${data}`;
}

function vazio(): BaldeDia {
  return { aceites: 0, recusadas: 0, sobreReservas: 0, minutosOcupados: 0, minutosOciosos: 0, minutosCapacidade: 0 };
}

function comoOrdem(chegada: Chegada, equipaId: string): Ordem {
  return {
    id: chegada.id,
    operadorId: chegada.operadorId,
    referencia: chegada.referencia,
    area: chegada.area,
    zonaId: "z-sim",
    equipaId,
    categoria: chegada.categoria,
    tecnologia: chegada.tecnologia,
    data: chegada.data,
    janelaInicio: chegada.janelaInicio,
    janelaFim: chegada.janelaFim,
    duracaoMin: chegada.duracaoMin,
    prioridade: "media",
    estado: "agendada",
    inicioPlaneado: null,
    fimPlaneado: null,
    inicioFixado: false,
    clienteNome: "Simulação",
    clienteContacto: "000",
    morada: chegada.area,
    nota: "",
    motivoCancelamento: null,
    quemPediu: null,
  };
}

function mundoDe(
  equipas: Equipa[],
  trabalhos: TrabalhoAceite[],
  margem: number,
  filtro?: { operadorId?: OperadorId; ignorarId?: string; extra?: TrabalhoAceite },
): Mundo {
  const lista = trabalhos.filter((item) => item.chegada.id !== filtro?.ignorarId);
  if (filtro?.extra) lista.push(filtro.extra);
  const visiveis = filtro?.operadorId ? lista.filter((item) => item.chegada.operadorId === filtro.operadorId) : lista;
  return {
    equipas,
    margemDeslocacaoMin: margem,
    ordens: visiveis.map((item) => comoOrdem(item.chegada, item.equipaId)),
  };
}

function carga(trabalhos: TrabalhoAceite[], operadorId?: OperadorId): number {
  return trabalhos.reduce((soma, item) => {
    if (operadorId && item.chegada.operadorId !== operadorId) return soma;
    return soma + item.chegada.duracaoMin;
  }, 0);
}

function cabe(
  equipas: Equipa[],
  trabalhos: TrabalhoAceite[],
  margem: number,
  equipaId: string,
  chegada: Chegada,
  politica: PoliticaId,
  ignorarId?: string,
): boolean {
  const extra: Trabalho = {
    id: chegada.id,
    janelaInicio: parseHHMM(chegada.janelaInicio),
    janelaFim: parseHHMM(chegada.janelaFim),
    duracao: chegada.duracaoMin,
  };
  const mundo = mundoDe(equipas, trabalhos, margem, {
    operadorId: politica === "independente" ? chegada.operadorId : undefined,
    ignorarId,
  });
  const restricoes = restricoesDaEquipa(equipas.find((linha) => linha.id === equipaId)!, chegada.data, margem);
  if (!restricoes || minutosDeTurno(restricoes) === 0) return false;
  return diaAceita(mundo, equipaId, chegada.data, [extra]);
}

function realizavel(equipa: Equipa, data: string, margem: number, trabalhos: TrabalhoAceite[]): { minutos: number; excesso: number } {
  if (trabalhos.length === 0) return { minutos: 0, excesso: 0 };
  const restricoes = restricoesDaEquipa(equipa, data, margem);
  if (!restricoes) return { minutos: 0, excesso: trabalhos.length };
  const ordenados = [...trabalhos].sort((a, b) => a.sequencia - b.sequencia);
  const todos = ordenados.map((item) => trabalhoDaOrdem(comoOrdem(item.chegada, equipa.id)));
  if (resolverSequencia(todos, restricoes)) {
    return { minutos: ordenados.reduce((soma, item) => soma + item.chegada.duracaoMin, 0), excesso: 0 };
  }
  const guardados: Trabalho[] = [];
  let minutos = 0;
  let excesso = 0;
  for (const item of ordenados) {
    const candidato = trabalhoDaOrdem(comoOrdem(item.chegada, equipa.id));
    if (resolverSequencia([...guardados, candidato], restricoes)) {
      guardados.push(candidato);
      minutos += item.chegada.duracaoMin;
    } else {
      excesso += 1;
    }
  }
  return { minutos, excesso };
}

export function avaliarPolitica(mundo: Mundo & { chegadas: Chegada[] }, politica: PoliticaId): CorridaPolitica {
  const calendarios = new Map<string, TrabalhoAceite[]>();
  const decisoes = new Map<string, "aceite" | "recusada" | "realocada">();
  const diario = new Map<string, BaldeDia>();
  const porOperador = new Map<OperadorId, number>([
    ["azul", 0],
    ["vermelho", 0],
    ["verde", 0],
  ]);
  const datas = [...new Set(mundo.chegadas.map((linha) => linha.data))];
  for (const data of datas) diario.set(data, vazio());

  const lista = (equipaId: string, data: string) => calendarios.get(chave(equipaId, data)) ?? [];
  let sequencia = 0;
  let aceites = 0;
  let recusadas = 0;
  let realocacoes = 0;

  const aceitar = (chegada: Chegada, equipaId: string, decisao: "aceite" | "realocada") => {
    sequencia += 1;
    const actual = [...lista(equipaId, chegada.data), { chegada, equipaId, sequencia }];
    calendarios.set(chave(equipaId, chegada.data), actual);
    decisoes.set(chegada.id, decisao);
    aceites += 1;
    diario.get(chegada.data)!.aceites += 1;
    porOperador.set(chegada.operadorId, (porOperador.get(chegada.operadorId) ?? 0) + 1);
  };

  for (const chegada of mundo.chegadas) {
    const capazes = mundo.equipas.filter((equipa) => {
      if (!equipaCobre(equipa, chegada.operadorId, chegada.categoria, chegada.tecnologia, chegada.area)) return false;
      const restricoes = restricoesDaEquipa(equipa, chegada.data, mundo.margemDeslocacaoMin);
      return Boolean(restricoes && minutosDeTurno(restricoes) > 0);
    });
    const operador = politica === "independente" ? chegada.operadorId : undefined;
    const ordenadas = [...capazes].sort(
      (a, b) =>
        carga(lista(a.id, chegada.data), operador) - carga(lista(b.id, chegada.data), operador) || a.id.localeCompare(b.id),
    );

    let colocada = false;
    for (const equipa of ordenadas) {
      if (!cabe(mundo.equipas, lista(equipa.id, chegada.data), mundo.margemDeslocacaoMin, equipa.id, chegada, politica)) continue;
      aceitar(chegada, equipa.id, "aceite");
      colocada = true;
      break;
    }

    if (!colocada && politica === "reencaixe") {
      const congestionadas = [...capazes].sort(
        (a, b) => carga(lista(b.id, chegada.data)) - carga(lista(a.id, chegada.data)) || a.id.localeCompare(b.id),
      );
      for (const equipa of congestionadas) {
        const moveis = [...lista(equipa.id, chegada.data)].sort(
          (a, b) => b.chegada.duracaoMin - a.chegada.duracaoMin || a.chegada.id.localeCompare(b.chegada.id),
        );
        for (const trabalho of moveis) {
          const pares = mundo.equipas.filter((par) => {
            if (par.id === equipa.id) return false;
            if (!equipaCobre(par, trabalho.chegada.operadorId, trabalho.chegada.categoria, trabalho.chegada.tecnologia, trabalho.chegada.area)) {
              return false;
            }
            const restricoes = restricoesDaEquipa(par, chegada.data, mundo.margemDeslocacaoMin);
            return Boolean(restricoes && minutosDeTurno(restricoes) > 0);
          });
          pares.sort((a, b) => carga(lista(a.id, chegada.data)) - carga(lista(b.id, chegada.data)) || a.id.localeCompare(b.id));
          for (const par of pares) {
            if (!cabe(mundo.equipas, lista(par.id, chegada.data), mundo.margemDeslocacaoMin, par.id, trabalho.chegada, "partilhada")) {
              continue;
            }
            const ficar = lista(equipa.id, chegada.data).filter((item) => item.chegada.id !== trabalho.chegada.id);
            if (!cabe(mundo.equipas, ficar, mundo.margemDeslocacaoMin, equipa.id, chegada, "partilhada")) continue;
            calendarios.set(chave(equipa.id, chegada.data), ficar);
            calendarios.set(chave(par.id, chegada.data), [...lista(par.id, chegada.data), { ...trabalho, equipaId: par.id }]);
            aceitar(chegada, equipa.id, "realocada");
            realocacoes += 1;
            colocada = true;
            break;
          }
          if (colocada) break;
        }
        if (colocada) break;
      }
    }

    if (!colocada) {
      decisoes.set(chegada.id, "recusada");
      recusadas += 1;
      diario.get(chegada.data)!.recusadas += 1;
    }
  }

  let sobreReservas = 0;
  let minutosOcupados = 0;
  let minutosOciosos = 0;
  let minutosCapacidade = 0;
  for (const data of datas) {
    const balde = diario.get(data)!;
    for (const equipa of mundo.equipas) {
      const restricoes = restricoesDaEquipa(equipa, data, mundo.margemDeslocacaoMin);
      if (!restricoes) continue;
      const capacidade = minutosDeTurno(restricoes);
      if (capacidade === 0) continue;
      const trabalhos = lista(equipa.id, data);
      const realizado = realizavel(equipa, data, mundo.margemDeslocacaoMin, trabalhos);
      const ocioso = capacidade - realizado.minutos;
      balde.minutosCapacidade += capacidade;
      balde.minutosOcupados += realizado.minutos;
      balde.minutosOciosos += ocioso;
      balde.sobreReservas += realizado.excesso;
      minutosCapacidade += capacidade;
      minutosOcupados += realizado.minutos;
      minutosOciosos += ocioso;
      sobreReservas += realizado.excesso;
    }
  }

  return {
    id: politica,
    aceites,
    recusadas,
    sobreReservas,
    minutosOcupados,
    minutosOciosos,
    minutosCapacidade,
    realocacoes,
    diario,
    decisoes,
    porOperador,
  };
}

export function avaliarMundo(mundo: Mundo & { chegadas: Chegada[] }): Record<PoliticaId, CorridaPolitica> {
  return {
    independente: avaliarPolitica(mundo, "independente"),
    partilhada: avaliarPolitica(mundo, "partilhada"),
    reencaixe: avaliarPolitica(mundo, "reencaixe"),
  };
}
