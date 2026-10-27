import { diaSemanaIso, eDataIso, hojeLisboa, somarDias } from "./rules/tempo";

/**
 * O «dia rico» da demonstração é o dia em que a história das três janelas (VD-URG, AZ-24081 e VR-90001 na
 * Equipa Minho) é visível. Não é uma data fixa: é hoje em Lisboa, ou o próximo dia útil se hoje for fim de semana.
 * `VC_DEMO_DIA=AAAA-MM-DD` fixa o dia (testes e filmagens reproduzíveis); se cair num fim de semana avança do mesmo modo.
 */

/** O próprio dia, se for útil (segunda a sexta); senão a segunda-feira seguinte. */
export function proximoDiaUtil(data: string): string {
  const dia = diaSemanaIso(data);
  return dia <= 5 ? data : somarDias(data, 8 - dia);
}

/** O dia útil imediatamente anterior a `data`. */
export function diaUtilAnterior(data: string): string {
  let dia = somarDias(data, -1);
  while (diaSemanaIso(dia) > 5) dia = somarDias(dia, -1);
  return dia;
}

/** O dia útil imediatamente a seguir a `data`. */
export function diaUtilSeguinte(data: string): string {
  let dia = somarDias(data, 1);
  while (diaSemanaIso(dia) > 5) dia = somarDias(dia, 1);
  return dia;
}

/** `n` dias úteis depois (n > 0) ou antes (n < 0) de `data`; com n = 0 devolve o próprio dia, ou o próximo dia útil. */
export function somarDiasUteis(data: string, n: number): string {
  let dia = proximoDiaUtil(data);
  for (let restantes = Math.abs(n); restantes > 0; restantes -= 1) {
    dia = n > 0 ? diaUtilSeguinte(dia) : diaUtilAnterior(dia);
  }
  return dia;
}

export function diaDemonstracao(agora: Date = new Date(), forcado: string | undefined = process.env.VC_DEMO_DIA): string {
  const fixo = forcado?.trim();
  if (fixo && eDataIso(fixo)) return proximoDiaUtil(fixo);
  return proximoDiaUtil(hojeLisboa(agora));
}
