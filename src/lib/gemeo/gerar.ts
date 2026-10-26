import { duracaoMinutos, janelasDe } from "@/lib/rules/catalogo";
import { equipaCobre } from "@/lib/rules/dia";
import { formatHHMM, parseHHMM, diaSemanaIso } from "@/lib/rules/tempo";
import { AREAS } from "@/lib/rules/areas";
import type { Categoria, Equipa, Mundo, OperadorId, Tecnologia } from "@/lib/rules/tipos";
import { AREAS_PROCURA, FROTA_GEMEO } from "./frota";
import { baralhar, escolher, ponderado, poisson, type Gerador } from "./rng";
import type { PedidoSimulacao } from "./pedido";

export const CHEGADAS_POR_AREA = 8;

export interface Chegada {
  id: string;
  referencia: string;
  operadorId: OperadorId;
  categoria: Categoria;
  tecnologia: Tecnologia | null;
  area: string;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  duracaoMin: number;
}

const CATEGORIAS: { valor: Categoria; peso: number }[] = [
  { valor: "instalacao", peso: 0.46 },
  { valor: "suporte", peso: 0.34 },
  { valor: "adicional", peso: 0.18 },
  { valor: "desligamento", peso: 0.02 },
];

const TEC_VERDE: { valor: Tecnologia; peso: number }[] = [
  { valor: "FTTH", peso: 0.74 },
  { valor: "CABO", peso: 0.26 },
];

function prefixo(operadorId: OperadorId): string {
  if (operadorId === "azul") return "AZ";
  if (operadorId === "vermelho") return "VR";
  return "VD";
}

function alguemCobre(
  equipas: readonly Equipa[],
  area: string,
  operadorId: OperadorId,
  categoria: Categoria,
  tecnologia: Tecnologia | null,
): boolean {
  return equipas.some((equipa) => equipaCobre(equipa, operadorId, categoria, tecnologia, area));
}

function sortearServico(
  rng: Gerador,
  equipas: readonly Equipa[],
  area: string,
  operadorId: OperadorId,
): { categoria: Categoria; tecnologia: Tecnologia | null } | null {
  let categoria = ponderado(rng, CATEGORIAS);
  if (categoria === "desligamento" && operadorId !== "verde") categoria = "adicional";
  if (operadorId !== "verde") {
    if (!alguemCobre(equipas, area, operadorId, categoria, null)) return null;
    return { categoria, tecnologia: null };
  }
  if (categoria === "desligamento") {
    if (alguemCobre(equipas, area, "verde", "desligamento", "ALARMES")) {
      return { categoria, tecnologia: "ALARMES" };
    }
    categoria = "adicional";
  }
  const tecnologias = TEC_VERDE.filter((item) => alguemCobre(equipas, area, "verde", categoria, item.valor));
  if (tecnologias.length === 0) return null;
  return { categoria, tecnologia: ponderado(rng, tecnologias) };
}

export function areasDaFrota(equipas: readonly Equipa[]): string[] {
  const unicas = [...new Set(equipas.flatMap((equipa) => equipa.areas))];
  return unicas.length > 0 ? unicas.sort() : [...AREAS_PROCURA];
}

export function gerarMundo(rng: Gerador, pedido: PedidoSimulacao, datas: string[], frota = FROTA_GEMEO): Mundo & { chegadas: Chegada[] } {
  const equipas: Equipa[] = frota.map((equipa) => ({ ...equipa, indisponibilidades: [] }));
  for (const data of datas) {
    const dia = diaSemanaIso(data);
    for (const equipa of equipas) {
      const horario = equipa.horarios.find((linha) => linha.diaSemana === dia);
      if (!horario || rng() >= pedido.probabilidadeFalta) continue;
      if (rng() < 0.4) {
        equipa.indisponibilidades.push({
          id: `falta-${equipa.id}-${data}`,
          data,
          inicio: horario.inicio,
          fim: horario.fim,
          motivo: "Falta da equipa",
        });
        continue;
      }
      const inicio = parseHHMM(horario.inicio);
      const fim = parseHHMM(horario.fim);
      const bloco = Math.max(60, Math.round((fim - inicio) * 0.4));
      const manha = rng() < 0.5;
      equipa.indisponibilidades.push({
        id: `falta-${equipa.id}-${data}-p`,
        data,
        inicio: manha ? horario.inicio : formatHHMM(fim - bloco),
        fim: manha ? formatHHMM(inicio + bloco) : horario.fim,
        motivo: manha ? "Falta de manhã" : "Falta de tarde",
      });
    }
  }

  const pesos = [
    { valor: "azul" as const, peso: pedido.pesos.azul },
    { valor: "vermelho" as const, peso: pedido.pesos.vermelho },
    { valor: "verde" as const, peso: pedido.pesos.verde },
  ];

  const areas = areasDaFrota(equipas).filter((area) => (AREAS as readonly string[]).includes(area));
  const ritmo = (CHEGADAS_POR_AREA * AREAS_PROCURA.length) / Math.max(1, areas.length);
  const chegadas: Chegada[] = [];
  let sequencia = 1;
  for (const data of datas) {
    const dia: Chegada[] = [];
    for (const area of areas) {
      const conta = poisson(rng, ritmo * pedido.procura);
      for (let indice = 0; indice < conta; indice += 1) {
        const operadorId = ponderado(rng, pesos);
        const servico = sortearServico(rng, equipas, area, operadorId);
        if (!servico) continue;
        const duracaoMin = duracaoMinutos(operadorId, servico.categoria, servico.tecnologia);
        const janelas = janelasDe(operadorId, servico.categoria);
        if (duracaoMin === null || janelas.length === 0) continue;
        const janela = escolher(rng, janelas);
        const id = `sim-${String(sequencia).padStart(4, "0")}`;
        sequencia += 1;
        dia.push({
          id,
          referencia: `${prefixo(operadorId)}-${String(sequencia - 1).padStart(4, "0")}`,
          operadorId,
          categoria: servico.categoria,
          tecnologia: servico.tecnologia,
          area,
          data,
          janelaInicio: janela.inicio,
          janelaFim: janela.fim,
          duracaoMin,
        });
      }
    }
    chegadas.push(...baralhar(rng, dia));
  }

  return { equipas, ordens: [], margemDeslocacaoMin: pedido.margemDeslocacaoMin, chegadas };
}
