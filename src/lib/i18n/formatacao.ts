import type { Idioma } from "./tipos";
import { diaSemanaIso, formatarData } from "@/lib/rules/tempo";

const DIAS_PT = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];
const DIAS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MESES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function localeDe(idioma: Idioma): string {
  return idioma === "en" ? "en-GB" : "pt-PT";
}

export function formatarDataLocale(data: string, idioma: Idioma): string {
  if (idioma === "en") {
    const [, mes, dia] = data.split("-");
    return `${Number(dia)} ${MESES_EN[Number(mes) - 1]} ${data.slice(0, 4)}`;
  }
  return formatarData(data);
}

export function formatarDataLongaLocale(data: string, idioma: Idioma): string {
  const indice = diaSemanaIso(data) - 1;
  const dia = idioma === "en" ? DIAS_EN[indice] : DIAS_PT[indice];
  return `${dia}, ${formatarDataLocale(data, idioma)}`;
}

export function formatarNumero(valor: number, idioma: Idioma, casas = 0): string {
  return new Intl.NumberFormat(localeDe(idioma), {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function formatarPercentagem(valor: number, idioma: Idioma, casas = 1): string {
  return new Intl.NumberFormat(localeDe(idioma), {
    style: "percent",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function formatarInstante(iso: string, idioma: Idioma): string {
  return new Date(iso).toLocaleString(localeDe(idioma), { timeZone: "Europe/Lisbon" });
}
