import { competenciasDeOperadores } from "@/lib/rules/operadores-servidos";
import type { Equipa, OperadorId } from "@/lib/rules/tipos";

/**
 * Frota compacta do gémeo. Algumas equipas servem só Azul+Vermelho (sem Verde)
 * para exercitar `operadoresServidos` ≠ 3; as outras servem os três.
 */

function diasUteis(inicio: string, fim: string) {
  return [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio, fim }));
}

function equipa(
  parcial: Omit<Equipa, "ativa" | "operadoresServidos" | "competencias" | "indisponibilidades"> & {
    operadoresServidos: OperadorId[];
  },
): Equipa {
  return {
    ...parcial,
    ativa: true,
    competencias: competenciasDeOperadores(parcial.operadoresServidos),
    indisponibilidades: [],
  };
}

export const FROTA_GEMEO: Equipa[] = [
  equipa({
    id: "eq-a-minho",
    codigo: "G-MI",
    nome: "Equipa Minho",
    base: "Braga",
    areas: ["Braga", "Guimarães"],
    operadoresServidos: ["azul", "vermelho", "verde"],
    horarios: diasUteis("08:00", "21:00"),
  }),
  equipa({
    id: "eq-b-ave",
    codigo: "G-AV",
    nome: "Equipa Ave",
    base: "Guimarães",
    areas: ["Braga", "Guimarães"],
    operadoresServidos: ["azul", "vermelho"],
    horarios: diasUteis("08:00", "20:00"),
  }),
  equipa({
    id: "eq-a-beiras",
    codigo: "G-BE",
    nome: "Equipa Beiras",
    base: "Viseu",
    areas: ["Viseu", "Guarda"],
    operadoresServidos: ["azul", "vermelho", "verde"],
    horarios: diasUteis("08:00", "21:00"),
  }),
  equipa({
    id: "eq-b-dao",
    codigo: "G-DA",
    nome: "Equipa Dão",
    base: "Viseu",
    areas: ["Viseu", "Guarda"],
    operadoresServidos: ["azul", "vermelho"],
    horarios: diasUteis("08:00", "20:00"),
  }),
];

export const AREAS_PROCURA = ["Braga", "Viseu"] as const;
