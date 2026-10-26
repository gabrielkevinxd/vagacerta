import type { Categoria, Equipa, Tecnologia } from "@/lib/rules/tipos";

/**
 * Frota compacta do gémeo, com a mesma lógica do protótipo: em cada área há
 * uma equipa que faz Verde e outra que não faz. As chegadas só usam Braga e Viseu.
 */

function diasUteis(inicio: string, fim: string) {
  return [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio, fim }));
}

const AZUL_VR: Equipa["competencias"] = [
  { operadorId: "azul", categorias: ["instalacao", "suporte", "adicional"], tecnologias: [] },
  { operadorId: "vermelho", categorias: ["instalacao", "suporte", "adicional"], tecnologias: [] },
];

const VERDE: Equipa["competencias"][number] = {
  operadorId: "verde",
  categorias: ["instalacao", "suporte", "adicional", "desligamento"] as Categoria[],
  tecnologias: ["FTTH", "CABO", "ALARMES"] as Tecnologia[],
};

export const FROTA_GEMEO: Equipa[] = [
  {
    id: "eq-a-minho",
    codigo: "G-MI",
    nome: "Equipa Minho",
    base: "Braga",
    areas: ["Braga", "Guimarães"],
    ativa: true,
    competencias: [...AZUL_VR, VERDE],
    horarios: diasUteis("08:00", "21:00"),
    indisponibilidades: [],
  },
  {
    id: "eq-b-ave",
    codigo: "G-AV",
    nome: "Equipa Ave",
    base: "Guimarães",
    areas: ["Braga", "Guimarães"],
    ativa: true,
    competencias: AZUL_VR,
    horarios: diasUteis("08:00", "20:00"),
    indisponibilidades: [],
  },
  {
    id: "eq-a-beiras",
    codigo: "G-BE",
    nome: "Equipa Beiras",
    base: "Viseu",
    areas: ["Viseu", "Guarda"],
    ativa: true,
    competencias: [...AZUL_VR, VERDE],
    horarios: diasUteis("08:00", "21:00"),
    indisponibilidades: [],
  },
  {
    id: "eq-b-dao",
    codigo: "G-DA",
    nome: "Equipa Dão",
    base: "Nelas",
    areas: ["Viseu", "Guarda"],
    ativa: true,
    competencias: AZUL_VR,
    horarios: diasUteis("08:00", "20:00"),
    indisponibilidades: [],
  },
];

export const AREAS_PROCURA = ["Braga", "Viseu"] as const;
