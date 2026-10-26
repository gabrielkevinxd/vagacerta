/** Horas como minutos desde a meia-noite. Intervalos de ocupação são semiabertos: [início, fim). */

export function parseHHMM(valor: string): number {
  const correspondencia = /^(\d{2}):(\d{2})$/.exec(valor);
  if (!correspondencia) throw new Error(`Hora inválida: ${valor}`);
  const horas = Number(correspondencia[1]);
  const minutos = Number(correspondencia[2]);
  if (horas > 23 || minutos > 59) throw new Error(`Hora inválida: ${valor}`);
  return horas * 60 + minutos;
}

export function formatHHMM(total: number): string {
  const seguro = Math.max(0, total);
  const horas = Math.floor(seguro / 60);
  const minutos = seguro % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

export function eDataIso(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

/** Dia da semana ISO: 1 = segunda … 7 = domingo. */
export function diaSemanaIso(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  const js = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  return js === 0 ? 7 : js;
}

export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const instante = new Date(Date.UTC(ano, mes - 1, dia + dias));
  const a = instante.getUTCFullYear();
  const m = String(instante.getUTCMonth() + 1).padStart(2, "0");
  const d = String(instante.getUTCDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

export function diaAnterior(data: string): string {
  return somarDias(data, -1);
}

export function diaSeguinte(data: string): string {
  return somarDias(data, 1);
}

export function intervalosSobrepostos(
  inicioA: number,
  fimA: number,
  inicioB: number,
  fimB: number,
): boolean {
  return inicioA < fimB && inicioB < fimA;
}

/** Data de calendário em Lisboa, no formato AAAA-MM-DD. */
export function hojeLisboa(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

const DIAS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];

export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataLonga(data: string): string {
  const indice = diaSemanaIso(data) - 1;
  return `${DIAS[indice]}, ${formatarData(data)}`;
}

export function semanaIso(data: string): { inicio: string; fim: string } {
  const deslocamento = diaSemanaIso(data) - 1;
  const inicio = somarDias(data, -deslocamento);
  return { inicio, fim: somarDias(inicio, 6) };
}
