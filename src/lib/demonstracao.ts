import { diaDemonstracao, diaUtilAnterior, diaUtilSeguinte } from "./demonstracao-dia";
import { recalcularDia } from "./rules/dia";
import { competenciasDeOperadores, OPERADORES_SERVIDOS_PADRAO } from "./rules/operadores-servidos";
import { somarDias } from "./rules/tempo";
import type { Categoria, Equipa, Mundo, OperadorId, Ordem, Papel, Prioridade, Tecnologia } from "./rules/tipos";
import { DEMO_AREA_PARA_DICOFRE, municipiosComCobertura, regioesPorNuts2 } from "./zonas/catalogo";

/**
 * Tudo o que é datado na semente (as ordens de ontem, do dia rico e de amanhã, a formação da Equipa Cávado,
 * o momento de criação) é relativo ao dia rico, que vem de `diaDemonstracao()` (hoje, ou VC_DEMO_DIA).
 * A história-estrela é a mesma em qualquer dia: só as datas se deslocam.
 *
 * Zona = município (DICOFRE). As 7 equipas de demonstração servem os 3 operadores.
 */

export interface RegiaoDemo {
  id: string;
  nome: string;
}
export interface ZonaDemo {
  id: string;
  regiaoId: string;
  codigo: string;
  nome: string;
}
export interface CcoDemo {
  id: string;
  nome: string;
}
export interface TecnicoDemo {
  id: string;
  equipaId: string;
  nome: string;
}
export interface VigenciaDemo {
  id: string;
  equipaId: string;
  zonaId: string;
  inicio: string;
  fim: string | null;
}
export interface UtilizadorDemo {
  id: string;
  nome: string;
  email: string;
  palavraPasse: string;
  papel: Papel;
  operadorId: OperadorId | null;
  tecnicoId: string | null;
}
export interface HistoricoDemo {
  id: string;
  ordemId: string;
  quando: string;
  acao: string;
  detalhe: string;
}

/** Momento de criação das ordens da semente: 08:00 UTC do dia útil anterior ao dia rico. */
export function criadaEmDemonstracao(dia: string): string {
  return `${diaUtilAnterior(dia)}T08:00:00.000Z`;
}

function diasUteis(inicio: string, fim: string) {
  return [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio, fim }));
}

const SERVEM_TODOS = [...OPERADORES_SERVIDOS_PADRAO];
const COMPETENCIAS_TODOS = competenciasDeOperadores(SERVEM_TODOS);

function equipaDemo(
  parcial: Omit<Equipa, "ativa" | "operadoresServidos" | "competencias" | "indisponibilidades"> & {
    indisponibilidades?: Equipa["indisponibilidades"];
  },
): Equipa {
  return {
    ...parcial,
    ativa: true,
    operadoresServidos: SERVEM_TODOS,
    competencias: COMPETENCIAS_TODOS,
    indisponibilidades: parcial.indisponibilidades ?? [],
  };
}

export function equipasDemonstracao(dia: string = diaDemonstracao()): Equipa[] {
  return [
    equipaDemo({
      id: "eq-minho",
      codigo: "N01-MI",
      nome: "Equipa Minho",
      base: "Braga",
      areas: ["Braga", "Guimarães"],
      horarios: diasUteis("08:00", "21:00"),
    }),
    equipaDemo({
      id: "eq-ave",
      codigo: "N06-AV",
      nome: "Equipa Ave",
      base: "Guimarães",
      areas: ["Braga", "Guimarães"],
      horarios: diasUteis("08:00", "20:00"),
    }),
    equipaDemo({
      id: "eq-cavado",
      codigo: "N02-CA",
      nome: "Equipa Cávado",
      base: "Barcelos",
      areas: ["Barcelos", "Esposende", "Braga"],
      horarios: diasUteis("08:00", "18:00"),
      indisponibilidades: [
        {
          id: "un-cavado-formacao",
          data: dia,
          inicio: "12:00",
          fim: "14:00",
          motivo: "Formação de segurança",
        },
      ],
    }),
    equipaDemo({
      id: "eq-douro",
      codigo: "N03-DO",
      nome: "Equipa Douro",
      base: "Vila Real",
      areas: ["Vila Real", "Chaves", "Vila Pouca de Aguiar"],
      horarios: diasUteis("08:00", "20:00"),
    }),
    equipaDemo({
      id: "eq-beiras",
      codigo: "C01-BE",
      nome: "Equipa Beiras",
      base: "Viseu",
      areas: ["Viseu", "Guarda", "Covilhã"],
      horarios: diasUteis("08:00", "22:00"),
    }),
    equipaDemo({
      id: "eq-litoral",
      codigo: "N04-LI",
      nome: "Equipa Litoral",
      base: "Aveiro",
      areas: ["Aveiro", "Águeda", "Oliveira de Azeméis"],
      horarios: diasUteis("09:00", "18:00"),
    }),
    equipaDemo({
      id: "eq-barroso",
      codigo: "N05-BA",
      nome: "Equipa Barroso",
      base: "Montalegre",
      areas: ["Chaves", "Boticas", "Montalegre"],
      horarios: diasUteis("08:30", "17:30"),
    }),
  ];
}

function zonaArea(area: string): string {
  return DEMO_AREA_PARA_DICOFRE[area] ?? "0303";
}

interface Rascunho {
  id: string;
  operadorId: OperadorId;
  referencia: string;
  area: string;
  zonaId: string;
  equipaId: string | null;
  categoria: Categoria;
  tecnologia: Tecnologia | null;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  duracaoMin: number;
  prioridade: Prioridade;
  estado: Ordem["estado"];
  clienteNome: string;
  clienteContacto: string;
  morada: string;
  nota: string;
}

function rascunho(parcial: Rascunho): Ordem {
  return {
    ...parcial,
    inicioPlaneado: null,
    fimPlaneado: null,
    inicioFixado: false,
    motivoCancelamento: parcial.estado === "cancelada" ? "O cliente adiou a visita." : null,
    quemPediu: parcial.estado === "cancelada" ? "cliente" : null,
  };
}

function ordensIniciais(dia: string): Ordem[] {
  const ontem = diaUtilAnterior(dia);
  const amanha = diaUtilSeguinte(dia);
  // O vídeo é público: telefones 900 000 0xx e moradas «Rua Exemplo N, <cidade>» (N = ordem na lista), sem dados verosímeis.
  let numero = 0;
  const linha = (
    id: string,
    operadorId: OperadorId,
    referencia: string,
    area: string,
    equipaId: string | null,
    categoria: Categoria,
    tecnologia: Tecnologia | null,
    data: string,
    janelaInicio: string,
    janelaFim: string,
    duracaoMin: number,
    prioridade: Prioridade,
    estado: Ordem["estado"],
    clienteNome: string,
    nota: string,
  ): Rascunho => {
    numero += 1;
    return {
      id,
      operadorId,
      referencia,
      area,
      zonaId: zonaArea(area),
      equipaId,
      categoria,
      tecnologia,
      data,
      janelaInicio,
      janelaFim,
      duracaoMin,
      prioridade,
      estado,
      clienteNome,
      clienteContacto: `900 000 0${String(numero).padStart(2, "0")}`,
      morada: `Rua Exemplo ${numero}, ${area}`,
      nota,
    };
  };
  const linhas: Rascunho[] = [
    linha("ord-az-26001", "azul", "AZ-26001", "Guimarães",  "eq-minho", "suporte", null, ontem, "08:00", "12:30", 45, "media", "agendada", "Rita Bonifácio", ""),
    linha("ord-vr-26002", "vermelho", "VR-26002", "Barcelos",  "eq-cavado", "suporte", null, ontem, "09:00", "11:00", 100, "media", "agendada", "Vasco Leme", ""),
    linha("ord-az-26003", "azul", "AZ-26003", "Vila Real",  "eq-douro", "instalacao", null, ontem, "10:00", "12:00", 180, "alta", "agendada", "Hélder Moutinho", ""),
    linha("ord-vd-26004", "verde", "VD-26004", "Viseu",  "eq-beiras", "suporte", "FTTH", ontem, "13:00", "18:00", 40, "baixa", "agendada", "Catarina Seixas", "Visita já executada na demonstração."),
    linha("ord-az-26005", "azul", "AZ-26005", "Águeda",  "eq-litoral", "suporte", null, ontem, "14:00", "17:30", 45, "alta", "agendada", "Nuno Guedelha", "O técnico marcou a visita como em curso."),
    linha("ord-vr-26006", "vermelho", "VR-26006", "Chaves",  "eq-barroso", "adicional", null, ontem, "08:30", "13:00", 60, "baixa", "agendada", "Sara Vinagre", ""),
    linha("ord-az-26007", "azul", "AZ-26007", "Guimarães",  "eq-ave", "adicional", null, ontem, "14:00", "18:00", 60, "media", "agendada", "Miguel Pestana", ""),

    linha("ord-az-24081", "azul", "AZ-24081", "Braga",  "eq-minho", "instalacao", null, dia, "10:00", "12:00", 180, "alta", "agendada", "Leonor Campos", "Instalação de 3 h. Começar às 10:00 ocupa a equipa até às 13:00."),
    linha("ord-vr-90001", "vermelho", "VR-90001", "Braga",  "eq-minho", "instalacao", null, dia, "09:00", "12:00", 155, "alta", "agendada", "Duarte Pimentel", "Cabe com a instalação azul se o início desta deslizar dentro da janela."),
    linha("ord-az-24120", "azul", "AZ-24120", "Barcelos",  "eq-cavado", "instalacao", null, dia, "08:00", "10:00", 180, "media", "agendada", "Ana Roriz", ""),
    linha("ord-vr-88350", "vermelho", "VR-88350", "Barcelos",  "eq-cavado", "adicional", null, dia, "14:00", "18:00", 60, "baixa", "agendada", "Paulo Gameiro", "A formação das 12:00 às 14:00 impede encaixar aqui a instalação das 09:00."),
    linha("ord-vr-88311", "vermelho", "VR-88311", "Vila Real",  "eq-douro", "instalacao", null, dia, "09:00", "12:00", 155, "media", "agendada", "Filipa Sardo", ""),
    linha("ord-vd-55210", "verde", "VD-55210", "Vila Real",  "eq-douro", "instalacao", "FTTH", dia, "13:00", "18:00", 130, "media", "agendada", "Gonçalo Bentes", ""),
    linha("ord-az-24090", "azul", "AZ-24090", "Vila Real",  "eq-douro", "suporte", null, dia, "14:00", "17:30", 45, "alta", "agendada", "Nádia Calçada", ""),
    linha("ord-az-24102", "azul", "AZ-24102", "Viseu",  "eq-beiras", "instalacao", null, dia, "08:00", "10:00", 180, "media", "agendada", "Tiago Furtado", ""),
    linha("ord-vr-88340", "vermelho", "VR-88340", "Viseu",  "eq-beiras", "suporte", null, dia, "11:00", "13:00", 100, "media", "agendada", "Inês Valadares", ""),
    linha("ord-vd-55240", "verde", "VD-55240", "Guarda",  "eq-beiras", "suporte", "CABO", dia, "13:00", "18:00", 40, "baixa", "agendada", "Martim Coelho", ""),
    linha("ord-az-24110", "azul", "AZ-24110", "Covilhã",  "eq-beiras", "adicional", null, dia, "17:00", "19:00", 60, "baixa", "agendada", "Olívia Branco", ""),
    linha("ord-vd-55280", "verde", "VD-55280", "Aveiro",  "eq-litoral", "instalacao", "ALARMES", dia, "08:00", "13:00", 150, "alta", "agendada", "Diogo Lameira", ""),
    linha("ord-az-24140", "azul", "AZ-24140", "Águeda",  "eq-litoral", "suporte", null, dia, "14:00", "17:30", 45, "media", "agendada", "Helena Pires", ""),
    linha("ord-vr-88390", "vermelho", "VR-88390", "Chaves",  "eq-barroso", "suporte", null, dia, "09:00", "11:00", 100, "media", "agendada", "Rui Taborda", ""),
    linha("ord-vd-55300", "verde", "VD-55300", "Chaves",  "eq-barroso", "instalacao", "DTH", dia, "13:00", "18:00", 90, "baixa", "agendada", "Clara Dinis", ""),
    linha("ord-az-27020", "azul", "AZ-27020", "Guimarães",  "eq-ave", "adicional", null, dia, "14:00", "18:00", 60, "baixa", "agendada", "Simão Leal", "A manhã fica livre para receber uma instalação vinda da Equipa Minho."),

    linha("ord-az-24160", "azul", "AZ-24160", "Guimarães",  "eq-minho", "suporte", null, amanha, "08:00", "12:30", 45, "media", "agendada", "Matilde Noronha", ""),
    linha("ord-vr-88420", "vermelho", "VR-88420", "Guimarães",  "eq-minho", "instalacao", null, amanha, "14:00", "17:00", 155, "media", "agendada", "Afonso Ribeiro", ""),

    linha("ord-vd-urg", "verde", "VD-URG", "Braga",  null, "instalacao", "FTTH", dia, "08:00", "13:00", 130, "alta", "em_espera", "Matilde Queirós", "Não cabe na Equipa Minho enquanto a instalação azul e a vermelha dividem o dia."),
    linha("ord-vr-fila-01", "vermelho", "VR-FILA-01", "Chaves",  null, "instalacao", null, dia, "14:00", "17:00", 155, "media", "em_espera", "Lourenço Paiva", "À espera de um intervalo na Equipa Barroso."),
    linha("ord-az-fila-01", "azul", "AZ-FILA-01", "Guarda",  null, "adicional", null, dia, "19:00", "21:00", 60, "baixa", "em_espera", "Diana Falcão", "Trabalho adicional, sem urgência."),
    linha("ord-vd-fila-01", "verde", "VD-FILA-01", "Aveiro",  null, "suporte", "FTTH", dia, "13:00", "18:00", 40, "media", "em_espera", "Ivo Salgado", "A Equipa Litoral já tem alarmes de manhã."),
    linha("ord-az-pend-01", "azul", "AZ-PEND-01", "Braga",  null, "instalacao", null, dia, "13:00", "15:00", 180, "media", "pendente", "Teresa Malhoa", "Registada pelo despachante, ainda sem tentativa de encaixe."),
    linha("ord-vr-canc-01", "vermelho", "VR-CANC-01", "Braga",  "eq-minho", "suporte", null, dia, "16:00", "18:00", 100, "baixa", "cancelada", "Eduardo Vilar", ""),
  ];
  return linhas.map(rascunho);
}

export function criarMundoDemonstracao(dia: string = diaDemonstracao()): Mundo {
  let mundo: Mundo = {
    equipas: equipasDemonstracao(dia),
    ordens: ordensIniciais(dia),
    margemDeslocacaoMin: 15,
  };
  const visto = new Set<string>();
  for (const ordem of mundo.ordens) {
    if (!ordem.equipaId || ordem.estado === "cancelada" || ordem.estado === "pendente" || ordem.estado === "em_espera") {
      continue;
    }
    const chave = `${ordem.equipaId}|${ordem.data}`;
    if (visto.has(chave)) continue;
    visto.add(chave);
    mundo = recalcularDia(mundo, ordem.equipaId, ordem.data);
  }
  const emCurso = mundo.ordens.find((ordem) => ordem.referencia === "AZ-26005");
  if (emCurso) {
    emCurso.estado = "em_curso";
    emCurso.inicioFixado = true;
  }
  const concluida = mundo.ordens.find((ordem) => ordem.referencia === "VD-26004");
  if (concluida) {
    concluida.estado = "concluida";
    concluida.inicioFixado = true;
  }
  return mundo;
}

export function regioesDemonstracao(): RegiaoDemo[] {
  return regioesPorNuts2();
}

/** Zona = município (DICOFRE) com cobertura catalogada. */
export function zonasDemonstracao(): ZonaDemo[] {
  const regioes = new Map(regioesPorNuts2().map((r) => [r.nome, r.id]));
  return municipiosComCobertura().map((m) => ({
    id: m.dicofre,
    regiaoId: regioes.get(m.nuts2) ?? "rg-norte",
    codigo: m.dicofre,
    nome: m.nome,
  }));
}

export function ccosDemonstracao(): CcoDemo[] {
  return [
    { id: "cco-minho", nome: "CCO Minho" },
    { id: "cco-douro", nome: "CCO Douro" },
    { id: "cco-centro", nome: "CCO Centro" },
  ];
}

export const EQUIPA_CCO: Record<string, string> = {
  "eq-minho": "cco-minho",
  "eq-ave": "cco-minho",
  "eq-cavado": "cco-minho",
  "eq-douro": "cco-douro",
  "eq-barroso": "cco-douro",
  "eq-litoral": "cco-douro",
  "eq-beiras": "cco-centro",
};

export function vigenciasDemonstracao(dia: string = diaDemonstracao()): VigenciaDemo[] {
  const zonaBase: Record<string, string> = {
    "eq-minho": "0303",
    "eq-ave": "0308",
    "eq-cavado": "0302",
    "eq-douro": "1714",
    "eq-litoral": "0105",
    "eq-barroso": "1706",
    "eq-beiras": "1823",
  };
  return equipasDemonstracao(dia).map((equipa) => ({
    id: `vig-${equipa.id}`,
    equipaId: equipa.id,
    zonaId: zonaBase[equipa.id] ?? zonaArea(equipa.base),
    // Em vigor desde há um ano: cobre o dia rico, os dias de ontem e de amanhã e os cenários dos dias seguintes.
    inicio: somarDias(dia, -365),
    fim: null,
  }));
}

export function tecnicosDemonstracao(): TecnicoDemo[] {
  return [
    { id: "tec-rui", equipaId: "eq-minho", nome: "Rui Salgado" },
    { id: "tec-ines", equipaId: "eq-minho", nome: "Inês Caldeira" },
    { id: "tec-joao", equipaId: "eq-ave", nome: "João Peseiro" },
    { id: "tec-marta", equipaId: "eq-cavado", nome: "Marta Vilela" },
    { id: "tec-pedro", equipaId: "eq-cavado", nome: "Pedro Gouveia" },
    { id: "tec-sofia", equipaId: "eq-douro", nome: "Sofia Ramalho" },
    { id: "tec-andre", equipaId: "eq-douro", nome: "André Pacheco" },
    { id: "tec-luisa", equipaId: "eq-beiras", nome: "Luísa Noronha" },
    { id: "tec-bruno", equipaId: "eq-beiras", nome: "Bruno Caeiro" },
    { id: "tec-helena", equipaId: "eq-litoral", nome: "Helena Fontes" },
    { id: "tec-diogo", equipaId: "eq-litoral", nome: "Diogo Laranjeira" },
    { id: "tec-carla", equipaId: "eq-barroso", nome: "Carla Moita" },
  ];
}

export function utilizadoresDemonstracao(): UtilizadorDemo[] {
  return [
    {
      id: "usr-admin",
      nome: "Teresa Varela",
      email: "admin@vagacerta.exemplo",
      palavraPasse: "vagacerta-admin",
      papel: "administrador",
      operadorId: null,
      tecnicoId: null,
    },
    {
      id: "usr-supervisor",
      nome: "Miguel Dantas",
      email: "supervisor@vagacerta.exemplo",
      palavraPasse: "vagacerta-supervisor",
      papel: "supervisor",
      operadorId: null,
      tecnicoId: null,
    },
    {
      id: "usr-azul",
      nome: "Clara Monteiro",
      email: "azul@vagacerta.exemplo",
      palavraPasse: "vagacerta-azul",
      papel: "despachante",
      operadorId: "azul",
      tecnicoId: null,
    },
    {
      id: "usr-vermelho",
      nome: "Gonçalo Pires",
      email: "vermelho@vagacerta.exemplo",
      palavraPasse: "vagacerta-vermelho",
      papel: "despachante",
      operadorId: "vermelho",
      tecnicoId: null,
    },
    {
      id: "usr-verde",
      nome: "Beatriz Lamego",
      email: "verde@vagacerta.exemplo",
      palavraPasse: "vagacerta-verde",
      papel: "despachante",
      operadorId: "verde",
      tecnicoId: null,
    },
    {
      id: "usr-tecnico",
      nome: "Rui Salgado",
      email: "tecnico.minho@vagacerta.exemplo",
      palavraPasse: "vagacerta-tecnico",
      papel: "tecnico",
      operadorId: null,
      tecnicoId: "tec-rui",
    },
  ];
}

export function historicoDemonstracao(dia: string = diaDemonstracao()): HistoricoDemo[] {
  const criada = criadaEmDemonstracao(dia);
  return [
    {
      id: "his-az-24081",
      ordemId: "ord-az-24081",
      quando: criada,
      acao: "criada",
      detalhe: "Ordem de demonstração marcada na Equipa Minho.",
    },
    {
      id: "his-vd-urg",
      ordemId: "ord-vd-urg",
      quando: criada,
      acao: "fila",
      detalhe: "Ficou em fila de espera: a Equipa Minho não fecha o dia com as três instalações.",
    },
    {
      id: "his-vr-canc",
      ordemId: "ord-vr-canc-01",
      quando: `${diaUtilAnterior(dia)}T11:00:00.000Z`,
      acao: "cancelada",
      detalhe: "O cliente adiou a visita.",
    },
  ];
}

export const OPERADORES_DEMO = [
  { id: "azul", nome: "Operador Azul", cor: "#1d4f91", horizonteDias: 15 },
  { id: "vermelho", nome: "Operador Vermelho", cor: "#a32020", horizonteDias: 15 },
  { id: "verde", nome: "Operador Verde", cor: "#1d7a45", horizonteDias: 21 },
] as const;
