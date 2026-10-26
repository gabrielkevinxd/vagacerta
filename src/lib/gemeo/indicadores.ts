import { detetarConflitos, minutosDeTurno, restricoesDaEquipa, utilizacaoDoDia } from "@/lib/rules/dia";
import type { Ator } from "@/lib/rules/permissoes";
import { podeLerOrdem, podeVerEquipa } from "@/lib/rules/permissoes";
import type { Mundo } from "@/lib/rules/tipos";
import type { IndicadoresDia } from "@/lib/contratos/gemeo";
import { avaliarPolitica } from "./avaliar";
import type { Chegada } from "./gerar";

function chegadaDeOrdem(mundo: Mundo, data: string): Chegada[] {
  return mundo.ordens
    .filter((ordem) => ordem.data === data && ordem.estado !== "cancelada")
    .sort((a, b) => a.referencia.localeCompare(b.referencia))
    .map((ordem) => ({
      id: ordem.id,
      referencia: ordem.referencia,
      operadorId: ordem.operadorId,
      categoria: ordem.categoria,
      tecnologia: ordem.tecnologia,
      area: ordem.area,
      data: ordem.data,
      janelaInicio: ordem.janelaInicio,
      janelaFim: ordem.janelaFim,
      duracaoMin: ordem.duracaoMin,
    }));
}

export function indicadoresDoDia(mundo: Mundo, data: string, ator: Ator): IndicadoresDia {
  const visiveis = utilizacaoDoDia(mundo, data).filter((linha) => podeVerEquipa(ator, linha.equipaId));
  const minutosOcupados = visiveis.reduce((soma, linha) => soma + linha.ocupadoMin, 0);
  const minutosCapacidade = visiveis.reduce((soma, linha) => soma + linha.turnoMin, 0);
  const recusadas = mundo.ordens.filter(
    (ordem) => ordem.data === data && ordem.estado === "em_espera" && podeLerOrdem(ator, ordem),
  ).length;
  let sobreReservas = 0;
  for (const equipa of mundo.equipas) {
    if (!podeVerEquipa(ator, equipa.id)) continue;
    sobreReservas += detetarConflitos(mundo, equipa.id, data).filter((conflito) => conflito.tipo === "sobreposicao").length;
  }

  let evitadas = 0;
  if (ator.papel === "administrador" || ator.papel === "supervisor") {
    const chegadas = chegadaDeOrdem(mundo, data);
    if (chegadas.length > 0) {
      const frota = mundo.equipas.map((equipa) => ({
        ...equipa,
        indisponibilidades: equipa.indisponibilidades.filter((bloco) => bloco.data === data),
      }));
      const independente = avaliarPolitica(
        { equipas: frota, ordens: [], margemDeslocacaoMin: mundo.margemDeslocacaoMin, chegadas },
        "independente",
      );
      evitadas = Math.max(0, independente.sobreReservas - sobreReservas);
    }
  }

  return {
    data,
    utilizacao: minutosCapacidade === 0 ? 0 : minutosOcupados / minutosCapacidade,
    minutosOcupados,
    minutosOciosos: Math.max(0, minutosCapacidade - minutosOcupados),
    minutosCapacidade,
    recusadas,
    sobreReservas,
    sobreReservasEvitadas: evitadas,
  };
}

export function capacidadeDoDia(mundo: Mundo, data: string): number {
  return mundo.equipas.reduce((soma, equipa) => {
    const restricoes = restricoesDaEquipa(equipa, data, mundo.margemDeslocacaoMin);
    return soma + (restricoes ? minutosDeTurno(restricoes) : 0);
  }, 0);
}
