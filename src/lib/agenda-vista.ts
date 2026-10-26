import type { Agenda, BlocoVista, LinhaVista } from "@/lib/rules/agenda";
import { formatHHMM } from "@/lib/rules/tempo";

export interface Eixo {
  inicioMin: number;
  fimMin: number;
}

export function eixoDasLinhas(linhas: Pick<LinhaVista, "turno" | "blocos" | "indisponibilidades">[]): Eixo {
  let inicio = 8 * 60;
  let fim = 18 * 60;
  for (const linha of linhas) {
    if (linha.turno) {
      const [horaInicio, minutoInicio] = linha.turno.inicio.split(":").map(Number);
      const [horaFim, minutoFim] = linha.turno.fim.split(":").map(Number);
      inicio = Math.min(inicio, horaInicio * 60 + minutoInicio);
      fim = Math.max(fim, horaFim * 60 + minutoFim);
    }
    for (const bloco of [...linha.blocos, ...linha.indisponibilidades]) {
      inicio = Math.min(inicio, bloco.inicioMin);
      fim = Math.max(fim, bloco.fimMin);
    }
  }
  inicio = Math.floor(inicio / 60) * 60;
  fim = Math.ceil(fim / 60) * 60;
  if (fim <= inicio) fim = inicio + 60;
  return { inicioMin: inicio, fimMin: fim };
}

export function minutoNoEixo(ratio: number, eixo: Eixo, passo = 5): number {
  const bruto = eixo.inicioMin + Math.min(1, Math.max(0, ratio)) * (eixo.fimMin - eixo.inicioMin);
  const limitado = Math.min(eixo.fimMin - passo, Math.max(eixo.inicioMin, bruto));
  return Math.round(limitado / passo) * passo;
}

export function percentagem(minuto: number, eixo: Eixo): number {
  const amplitude = eixo.fimMin - eixo.inicioMin;
  if (amplitude <= 0) return 0;
  return ((minuto - eixo.inicioMin) / amplitude) * 100;
}

export function fundirAgenda(base: Agenda, parcial: Agenda): Agenda {
  const porData = new Map(parcial.dias.map((dia) => [dia.data, dia]));
  return {
    ...base,
    margemDeslocacaoMin: parcial.margemDeslocacaoMin,
    dias: base.dias.map((dia) => porData.get(dia.data) ?? dia),
  };
}

export function moverBloco(
  agenda: Agenda,
  id: string,
  destino: { equipaId: string; data: string; inicioMin: number },
): Agenda {
  let encontrado: BlocoVista | null = null;
  const diasSem = agenda.dias.map((dia) => ({
    ...dia,
    equipas: dia.equipas.map((equipa) => {
      const bloco = equipa.blocos.find((item) => item.id === id);
      if (bloco) encontrado = bloco;
      return {
        ...equipa,
        blocos: equipa.blocos.filter((item) => item.id !== id),
        conflitos: equipa.conflitos.filter((conflito) => conflito.ordemId !== id),
      };
    }),
  }));
  if (!encontrado) return agenda;
  const bloco: BlocoVista = encontrado;
  const seguinte: BlocoVista = {
    ...bloco,
    inicioMin: destino.inicioMin,
    fimMin: destino.inicioMin + bloco.duracaoMin,
    inicio: formatHHMM(destino.inicioMin),
    fim: formatHHMM(destino.inicioMin + bloco.duracaoMin),
  };
  return {
    ...agenda,
    dias: diasSem.map((dia) => {
      if (dia.data !== destino.data) return dia;
      return {
        ...dia,
        equipas: dia.equipas.map((equipa) =>
          equipa.equipaId === destino.equipaId
            ? { ...equipa, blocos: [...equipa.blocos, seguinte].sort((a, b) => a.inicioMin - b.inicioMin) }
            : equipa,
        ),
      };
    }),
  };
}

export function faixasDosBlocos(blocos: BlocoVista[]): { bloco: BlocoVista; faixa: number; faixas: number }[] {
  const ordenados = [...blocos].sort((a, b) => a.inicioMin - b.inicioMin || a.id.localeCompare(b.id));
  const fins: number[] = [];
  const colocados = ordenados.map((bloco) => {
    let faixa = fins.findIndex((fim) => fim <= bloco.inicioMin);
    if (faixa < 0) {
      faixa = fins.length;
      fins.push(bloco.fimMin);
    } else {
      fins[faixa] = bloco.fimMin;
    }
    return { bloco, faixa };
  });
  const total = Math.max(1, fins.length);
  return colocados.map((item) => ({ ...item, faixas: total }));
}
