import { AREAS } from "@/lib/rules/areas";
import { janelasDe } from "@/lib/rules/catalogo";
import { somarDias } from "@/lib/rules/tempo";
import type { OperadorId } from "@/lib/rules";
import { CAMPOS_RESERVA, type CampoReserva, type ReservaEstruturada } from "./tipos";
import { eTipoIntervencao, tipoDeCategoria, type TipoIntervencao } from "./quotas";
import { zonaDaArea } from "./zonas";

export type ReservaParcial = Partial<ReservaEstruturada> & { operadorId: OperadorId };

const TIPOS: { chave: TipoIntervencao; padroes: RegExp[] }[] = [
  { chave: "adicional", padroes: [/adicional/i, /\badd-on\b/i, /\badditional\b/i] },
  { chave: "manutencao", padroes: [/manuten/i, /suporte/i, /\bsupport\b/i, /avaria/i] },
  { chave: "instalacao", padroes: [/instala/i, /\binstall/i] },
];

const DIAS: { iso: number; padroes: RegExp[] }[] = [
  { iso: 1, padroes: [/\bsegunda\b/i, /\bmonday\b/i] },
  { iso: 2, padroes: [/\bter[cç]a\b/i, /\btuesday\b/i] },
  { iso: 3, padroes: [/\bquarta\b/i, /\bwednesday\b/i] },
  { iso: 4, padroes: [/\bquinta\b/i, /\bthursday\b/i] },
  { iso: 5, padroes: [/\bsexta\b/i, /\bfriday\b/i] },
];

function proximoDiaSemana(iso: number, origem: string): string {
  for (let i = 0; i < 8; i += 1) {
    const data = somarDias(origem, i === 0 ? 0 : i);
    const js = new Date(`${data}T12:00:00`).getUTCDay();
    const nosso = js === 0 ? 7 : js;
    if (nosso === iso) return data;
  }
  return origem;
}

export function camposEmFalta(parcial: ReservaParcial): CampoReserva[] {
  const falta: CampoReserva[] = [];
  for (const campo of CAMPOS_RESERVA) {
    if (campo === "janelaInicio" || campo === "janelaFim") {
      if (!parcial.janelaInicio || !parcial.janelaFim) falta.push(campo);
      continue;
    }
    if (campo === "resourceId") {
      if (!parcial.resourceId && !parcial.tecnicoId) falta.push("resourceId");
      continue;
    }
    const valor = parcial[campo];
    if (valor === undefined || valor === null || String(valor).trim() === "") falta.push(campo);
  }
  return [...new Set(falta)];
}

export function interpretarPedido(texto: string, operadorId: OperadorId, hoje?: string): {
  extraidos: ReservaParcial;
  emFalta: CampoReserva[];
} {
  const limpo = texto.trim();
  const extraidos: ReservaParcial = { operadorId };

  if (!limpo) return { extraidos, emFalta: camposEmFalta(extraidos) };

  for (const item of TIPOS) {
    if (item.padroes.some((p) => p.test(limpo))) {
      extraidos.tipoIntervencao = item.chave;
      break;
    }
  }

  const area = AREAS.find((nome) => limpo.toLowerCase().includes(nome.toLowerCase()));
  if (area) {
    extraidos.city = area;
    extraidos.zona = zonaDaArea(area);
  }

  const iso = limpo.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) extraidos.data = iso[1];
  else if (hoje) {
    const dia = DIAS.find((item) => item.padroes.some((p) => p.test(limpo)));
    if (dia) extraidos.data = proximoDiaSemana(dia.iso, hoje);
  }

  const horaMatch =
    limpo.match(/\b(?:às|as|at)\s+(\d{1,2})(?::(\d{2}))?h?\b/i) ??
    limpo.match(/\b(\d{1,2}):(\d{2})\b/) ??
    limpo.match(/\b(\d{1,2})h\b/i);
  if (horaMatch && extraidos.tipoIntervencao) {
    const hora = `${String(Number(horaMatch[1])).padStart(2, "0")}:${(horaMatch[2] ?? "00").padStart(2, "0")}`;
    const lista = janelasDe(operadorId, categoriaDoTipoLocal(extraidos.tipoIntervencao));
    const exacta = lista.find((janela) => janela.inicio === hora) ?? lista.find((janela) => janela.inicio <= hora && hora < janela.fim);
    if (exacta) {
      extraidos.janelaInicio = exacta.inicio;
      extraidos.janelaFim = exacta.fim;
    }
  }

  const cliente =
    limpo.match(/(?:cliente|customer)\s+([^,.]+)/i)?.[1]?.trim() ??
    limpo.match(/para\s+(?:o|a)\s+([^,.]+)/i)?.[1]?.trim();
  if (cliente) extraidos.customerName = cliente.slice(0, 80);

  const appt = limpo.match(/\b(?:appt|ref(?:erência|erencia)?|ordem)\s*[:#]?\s*([A-Z]{2,3}-[\w]+)/i);
  if (appt?.[1]) extraidos.apptNumber = appt[1];

  const cp = limpo.match(/\b(\d{4}-\d{3})\b/);
  if (cp) extraidos.postalCode = cp[1];

  return { extraidos, emFalta: camposEmFalta(extraidos) };
}

function categoriaDoTipoLocal(tipo: TipoIntervencao) {
  return tipo === "manutencao" ? "suporte" : tipo === "adicional" ? "adicional" : "instalacao";
}

export function aplicarExtracao(base: ReservaParcial, extra: Record<string, string | undefined>): ReservaParcial {
  const seguinte: ReservaParcial = { ...base };
  if (extra.zona) seguinte.zona = extra.zona;
  if (extra.city) {
    seguinte.city = extra.city;
    if (!seguinte.zona) seguinte.zona = zonaDaArea(extra.city);
  }
  if (extra.data) seguinte.data = extra.data;
  if (extra.janelaInicio) seguinte.janelaInicio = extra.janelaInicio;
  if (extra.horaInicio && !seguinte.janelaInicio) {
    const lista = janelasDe(base.operadorId, categoriaDoTipoLocal(eTipoIntervencao(extra.tipoIntervencao ?? "") ? extra.tipoIntervencao as TipoIntervencao : tipoDeCategoria(extra.categoria ?? "instalacao")));
    const hora = extra.horaInicio;
    const exacta = lista.find((janela) => janela.inicio === hora) ?? lista.find((janela) => janela.inicio <= hora && hora < janela.fim);
    if (exacta) {
      seguinte.janelaInicio = exacta.inicio;
      seguinte.janelaFim = exacta.fim;
    }
  }
  if (extra.janelaFim) seguinte.janelaFim = extra.janelaFim;
  if (extra.tipoIntervencao && eTipoIntervencao(extra.tipoIntervencao)) seguinte.tipoIntervencao = extra.tipoIntervencao;
  if (extra.categoria) seguinte.tipoIntervencao = tipoDeCategoria(extra.categoria);
  if (extra.resourceId) seguinte.resourceId = extra.resourceId;
  if (extra.tecnicoId) seguinte.tecnicoId = extra.tecnicoId;
  if (extra.apptNumber) seguinte.apptNumber = extra.apptNumber;
  if (extra.customerName) seguinte.customerName = extra.customerName;
  if (extra.streetAddress) seguinte.streetAddress = extra.streetAddress;
  if (extra.postalCode) seguinte.postalCode = extra.postalCode;
  if (extra.latitude) seguinte.latitude = extra.latitude;
  if (extra.longitude) seguinte.longitude = extra.longitude;
  return seguinte;
}
