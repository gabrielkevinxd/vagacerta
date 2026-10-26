import { diaAnterior, diaSeguinte, eDataIso } from "./tempo";

/** Período inclusivo. `fim` nulo significa «até nova indicação». */
export interface Periodo {
  id: string;
  chave: string;
  inicio: string;
  fim: string | null;
}

export interface ResultadoPeriodo {
  ok: true;
  periodos: Periodo[];
  alterou: boolean;
}

export interface FalhaPeriodo {
  ok: false;
  codigo: "PASSADO" | "INTERVALO" | "DATA";
  mensagem: string;
}

function fimEfetivo(periodo: Periodo): string {
  return periodo.fim ?? "9999-12-31";
}

function sobrepoe(a: Periodo, b: Periodo): boolean {
  return a.inicio <= fimEfetivo(b) && b.inicio <= fimEfetivo(a);
}

function cobre(existente: Periodo, novo: Periodo): boolean {
  return existente.chave === novo.chave && existente.inicio <= novo.inicio && fimEfetivo(existente) >= fimEfetivo(novo);
}

function recortar(existente: Periodo, novo: Periodo): Periodo[] {
  if (!sobrepoe(existente, novo)) return [existente];
  const restos: Periodo[] = [];
  if (existente.inicio < novo.inicio) {
    restos.push({ ...existente, id: `${existente.id}-e`, fim: diaAnterior(novo.inicio) });
  }
  if (novo.fim !== null && fimEfetivo(existente) > novo.fim) {
    restos.push({
      ...existente,
      id: `${existente.id}-d`,
      inicio: diaSeguinte(novo.fim),
      fim: existente.fim,
    });
  }
  return restos;
}

function juntar(periodos: Periodo[]): Periodo[] {
  const ordenados = [...periodos].sort(
    (a, b) => a.inicio.localeCompare(b.inicio) || a.chave.localeCompare(b.chave) || a.id.localeCompare(b.id),
  );
  const saida: Periodo[] = [];
  for (const periodo of ordenados) {
    const ultimo = saida[saida.length - 1];
    const encosta =
      ultimo &&
      ultimo.chave === periodo.chave &&
      (ultimo.fim === null || diaSeguinte(ultimo.fim) >= periodo.inicio);
    if (ultimo && encosta) {
      if (ultimo.fim === null || periodo.fim === null) ultimo.fim = null;
      else if (periodo.fim > ultimo.fim) ultimo.fim = periodo.fim;
      continue;
    }
    saida.push({ ...periodo });
  }
  return saida;
}

/**
 * Atribui um período e recorta o que existia (encurta, divide ou remove).
 * Períodos vizinhos com a mesma chave juntam-se. Repetir uma cobertura
 * existente não grava. Corrigir o passado exige `confirmacao`.
 * A lista é de um só sujeito (uma equipa, ou uma zona).
 */
export function atribuirPeriodo(
  periodos: Periodo[],
  novo: { id?: string; chave: string; inicio: string; fim: string | null },
  opcoes?: { hoje?: string; confirmacao?: boolean },
): ResultadoPeriodo | FalhaPeriodo {
  if (!eDataIso(novo.inicio) || (novo.fim !== null && !eDataIso(novo.fim))) {
    return { ok: false, codigo: "DATA", mensagem: "As datas do período têm de estar no formato AAAA-MM-DD." };
  }
  if (novo.fim !== null && novo.fim < novo.inicio) {
    return { ok: false, codigo: "INTERVALO", mensagem: "O fim do período não pode ser anterior ao início." };
  }
  const hoje = opcoes?.hoje;
  if (hoje && novo.inicio < hoje && !opcoes?.confirmacao) {
    return {
      ok: false,
      codigo: "PASSADO",
      mensagem: "Corrigir um período que já começou exige confirmação. O passado não se reescreve sozinho.",
    };
  }

  const candidato: Periodo = {
    id: novo.id ?? `vig-${novo.chave}-${novo.inicio}`,
    chave: novo.chave,
    inicio: novo.inicio,
    fim: novo.fim,
  };
  if (periodos.some((periodo) => cobre(periodo, candidato))) {
    return { ok: true, periodos, alterou: false };
  }

  const recortados = periodos.flatMap((periodo) => recortar(periodo, candidato));
  const juntos = juntar([...recortados, candidato]);
  return { ok: true, periodos: juntos, alterou: true };
}

export function vigenteEm<T extends { inicio: string; fim: string | null }>(periodos: T[], data: string): T | null {
  return periodos.find((periodo) => periodo.inicio <= data && (periodo.fim === null || periodo.fim >= data)) ?? null;
}
