import type { Categoria, OperadorId, Tecnologia } from "./tipos";

/**
 * Catálogo de demonstração das janelas de início e das durações.
 * A janela é o intervalo em que o trabalho pode COMEÇAR. Não é o tempo de execução:
 * a ocupação pode terminar depois do fim da janela.
 * A tecnologia só existe no Operador Verde.
 */

export interface JanelaInicio {
  id: string;
  operadorId: OperadorId;
  categoria: Categoria | "qualquer";
  codigo: string;
  inicio: string;
  fim: string;
}

export const JANELAS_INICIO: JanelaInicio[] = [
  { id: "azul-i1-0800", operadorId: "azul", categoria: "instalacao", codigo: "I1", inicio: "08:00", fim: "10:00" },
  { id: "azul-i1-1000", operadorId: "azul", categoria: "instalacao", codigo: "I1", inicio: "10:00", fim: "12:00" },
  { id: "azul-i1-1300", operadorId: "azul", categoria: "instalacao", codigo: "I1", inicio: "13:00", fim: "15:00" },
  { id: "azul-i1-1730", operadorId: "azul", categoria: "instalacao", codigo: "I1", inicio: "17:30", fim: "20:30" },

  { id: "azul-i8-0800", operadorId: "azul", categoria: "adicional", codigo: "I8", inicio: "08:00", fim: "12:00" },
  { id: "azul-i8-1300", operadorId: "azul", categoria: "adicional", codigo: "I8", inicio: "13:00", fim: "17:00" },
  { id: "azul-i8-1700", operadorId: "azul", categoria: "adicional", codigo: "I8", inicio: "17:00", fim: "19:00" },
  { id: "azul-i8-1900", operadorId: "azul", categoria: "adicional", codigo: "I8", inicio: "19:00", fim: "21:00" },

  { id: "azul-a1-0800", operadorId: "azul", categoria: "suporte", codigo: "A1", inicio: "08:00", fim: "12:30" },
  { id: "azul-a1-1400", operadorId: "azul", categoria: "suporte", codigo: "A1", inicio: "14:00", fim: "17:30" },
  { id: "azul-a1-1800", operadorId: "azul", categoria: "suporte", codigo: "A1", inicio: "18:00", fim: "20:00" },
  { id: "azul-a1-2000", operadorId: "azul", categoria: "suporte", codigo: "A1", inicio: "20:00", fim: "22:00" },

  { id: "vermelho-inst-0900", operadorId: "vermelho", categoria: "instalacao", codigo: "INST", inicio: "09:00", fim: "12:00" },
  { id: "vermelho-inst-1400", operadorId: "vermelho", categoria: "instalacao", codigo: "INST", inicio: "14:00", fim: "17:00" },
  { id: "vermelho-inst-1800", operadorId: "vermelho", categoria: "instalacao", codigo: "INST", inicio: "18:00", fim: "21:00" },

  { id: "vermelho-sup-0900", operadorId: "vermelho", categoria: "suporte", codigo: "SUP", inicio: "09:00", fim: "11:00" },
  { id: "vermelho-sup-1100", operadorId: "vermelho", categoria: "suporte", codigo: "SUP", inicio: "11:00", fim: "13:00" },
  { id: "vermelho-sup-1400", operadorId: "vermelho", categoria: "suporte", codigo: "SUP", inicio: "14:00", fim: "16:00" },
  { id: "vermelho-sup-1600", operadorId: "vermelho", categoria: "suporte", codigo: "SUP", inicio: "16:00", fim: "18:00" },
  { id: "vermelho-sup-1800", operadorId: "vermelho", categoria: "suporte", codigo: "SUP", inicio: "18:00", fim: "20:00" },
  { id: "vermelho-sup-2000", operadorId: "vermelho", categoria: "suporte", codigo: "SUP", inicio: "20:00", fim: "22:00" },

  { id: "vermelho-add-0830", operadorId: "vermelho", categoria: "adicional", codigo: "ADD", inicio: "08:30", fim: "13:00" },
  { id: "vermelho-add-1400", operadorId: "vermelho", categoria: "adicional", codigo: "ADD", inicio: "14:00", fim: "18:00" },
  { id: "vermelho-add-1800", operadorId: "vermelho", categoria: "adicional", codigo: "ADD", inicio: "18:00", fim: "21:00" },

  { id: "verde-am", operadorId: "verde", categoria: "qualquer", codigo: "AM", inicio: "08:00", fim: "13:00" },
  { id: "verde-pm", operadorId: "verde", categoria: "qualquer", codigo: "PM", inicio: "13:00", fim: "18:00" },
];

/** Minutos. Verde: instalação / suporte / trabalho adicional / desligamento. */
const DURACAO_VERDE: Record<Tecnologia, Record<Categoria, number | null>> = {
  FTTH: { instalacao: 130, suporte: 40, adicional: 75, desligamento: null },
  CABO: { instalacao: 80, suporte: 40, adicional: 60, desligamento: null },
  DTH: { instalacao: 90, suporte: 45, adicional: 60, desligamento: null },
  SEA: { instalacao: 150, suporte: 75, adicional: 120, desligamento: null },
  ALARMES: { instalacao: 150, suporte: 60, adicional: 60, desligamento: 30 },
};

export function duracaoMinutos(
  operadorId: OperadorId,
  categoria: Categoria,
  tecnologia: Tecnologia | null,
): number | null {
  if (operadorId === "azul") {
    if (categoria === "instalacao") return 180;
    if (categoria === "suporte") return 45;
    if (categoria === "adicional") return 60;
    return null;
  }
  if (operadorId === "vermelho") {
    if (categoria === "instalacao") return 2 * 60 + 35;
    if (categoria === "suporte") return 60 + 40;
    if (categoria === "adicional") return 60;
    return null;
  }
  if (!tecnologia) return null;
  return DURACAO_VERDE[tecnologia][categoria];
}

export function janelasDe(operadorId: OperadorId, categoria: Categoria): JanelaInicio[] {
  return JANELAS_INICIO.filter(
    (janela) =>
      janela.operadorId === operadorId &&
      (janela.categoria === "qualquer" || janela.categoria === categoria),
  );
}

export function corresponderJanela(
  operadorId: OperadorId,
  categoria: Categoria,
  inicio: string,
  fim: string,
): JanelaInicio | undefined {
  return janelasDe(operadorId, categoria).find((janela) => janela.inicio === inicio && janela.fim === fim);
}

/** Acima disto a folga de início publica-se como janela opcional, não como disponível. */
export const FOLGA_OPCIONAL_MIN = 15;
