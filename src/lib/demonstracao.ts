import { recalcularDia } from "./rules/dia";
import type { Categoria, Equipa, Mundo, OperadorId, Ordem, Papel, Prioridade, Tecnologia } from "./rules/tipos";

/** Dia rico da demonstração: terça-feira em que a história das três janelas é visível. */
export const DATA_DEMONSTRACAO = "2026-10-27";

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

const CRIADA = "2026-10-26T08:00:00.000Z";

function diasUteis(inicio: string, fim: string) {
  return [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio, fim }));
}

function competencia(
  operadorId: OperadorId,
  categorias: Categoria[],
  tecnologias: Tecnologia[] = [],
): Equipa["competencias"][number] {
  return { operadorId, categorias, tecnologias };
}

const AZUL = ["instalacao", "suporte", "adicional"] as Categoria[];
const VERMELHO = ["instalacao", "suporte", "adicional"] as Categoria[];
const VERDE = ["instalacao", "suporte", "adicional", "desligamento"] as Categoria[];

export function equipasDemonstracao(): Equipa[] {
  return [
    {
      id: "eq-minho",
      codigo: "N01-MI",
      nome: "Equipa Minho",
      base: "Braga",
      areas: ["Braga", "Guimarães"],
      ativa: true,
      competencias: [
        competencia("azul", AZUL),
        competencia("vermelho", VERMELHO),
        competencia("verde", VERDE, ["FTTH", "CABO", "ALARMES"]),
      ],
      horarios: diasUteis("08:00", "21:00"),
      indisponibilidades: [],
    },
    {
      id: "eq-ave",
      codigo: "N06-AV",
      nome: "Equipa Ave",
      base: "Guimarães",
      areas: ["Braga", "Guimarães"],
      ativa: true,
      competencias: [competencia("azul", AZUL), competencia("vermelho", VERMELHO)],
      horarios: diasUteis("08:00", "20:00"),
      indisponibilidades: [],
    },
    {
      id: "eq-cavado",
      codigo: "N02-CA",
      nome: "Equipa Cávado",
      base: "Barcelos",
      areas: ["Barcelos", "Esposende", "Braga"],
      ativa: true,
      competencias: [competencia("azul", AZUL), competencia("vermelho", VERMELHO)],
      horarios: diasUteis("08:00", "18:00"),
      indisponibilidades: [
        {
          id: "un-cavado-formacao",
          data: DATA_DEMONSTRACAO,
          inicio: "12:00",
          fim: "14:00",
          motivo: "Formação de segurança",
        },
      ],
    },
    {
      id: "eq-douro",
      codigo: "N03-DO",
      nome: "Equipa Douro",
      base: "Vila Real",
      areas: ["Vila Real", "Chaves", "Vila Pouca de Aguiar"],
      ativa: true,
      competencias: [
        competencia("azul", AZUL),
        competencia("vermelho", VERMELHO),
        competencia("verde", ["instalacao", "suporte", "adicional"], ["FTTH", "DTH", "SEA"]),
      ],
      horarios: diasUteis("08:00", "20:00"),
      indisponibilidades: [],
    },
    {
      id: "eq-beiras",
      codigo: "C01-BE",
      nome: "Equipa Beiras",
      base: "Viseu",
      areas: ["Viseu", "Guarda", "Covilhã"],
      ativa: true,
      competencias: [
        competencia("azul", AZUL),
        competencia("vermelho", VERMELHO),
        competencia("verde", VERDE, ["FTTH", "CABO", "DTH", "SEA", "ALARMES"]),
      ],
      horarios: diasUteis("08:00", "22:00"),
      indisponibilidades: [],
    },
    {
      id: "eq-litoral",
      codigo: "N04-LI",
      nome: "Equipa Litoral",
      base: "Aveiro",
      areas: ["Aveiro", "Águeda", "Oliveira de Azeméis"],
      ativa: true,
      competencias: [
        competencia("azul", AZUL),
        competencia("verde", VERDE, ["FTTH", "CABO", "ALARMES"]),
      ],
      horarios: diasUteis("09:00", "18:00"),
      indisponibilidades: [],
    },
    {
      id: "eq-barroso",
      codigo: "N05-BA",
      nome: "Equipa Barroso",
      base: "Montalegre",
      areas: ["Chaves", "Boticas", "Montalegre"],
      ativa: true,
      competencias: [
        competencia("vermelho", VERMELHO),
        competencia("verde", ["instalacao", "suporte", "adicional"], ["FTTH", "DTH"]),
      ],
      horarios: diasUteis("08:30", "17:30"),
      indisponibilidades: [],
    },
  ];
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

function ordensIniciais(): Ordem[] {
  const linhas: Rascunho[] = [
    linha("ord-az-26001", "azul", "AZ-26001", "Guimarães", "zn-n06", "eq-minho", "suporte", null, "2026-10-26", "08:00", "12:30", 45, "media", "agendada", "Rita Bonifácio", "910 100 201", "Rua de Santa Maria 14, Guimarães", ""),
    linha("ord-vr-26002", "vermelho", "VR-26002", "Barcelos", "zn-n02", "eq-cavado", "suporte", null, "2026-10-26", "09:00", "11:00", 100, "media", "agendada", "Vasco Leme", "920 100 202", "Avenida dos Combatentes 88, Barcelos", ""),
    linha("ord-az-26003", "azul", "AZ-26003", "Vila Real", "zn-n03", "eq-douro", "instalacao", null, "2026-10-26", "10:00", "12:00", 180, "alta", "agendada", "Hélder Moutinho", "930 100 203", "Rua da Misericórdia 5, Vila Real", ""),
    linha("ord-vd-26004", "verde", "VD-26004", "Viseu", "zn-c01", "eq-beiras", "suporte", "FTTH", "2026-10-26", "13:00", "18:00", 40, "baixa", "agendada", "Catarina Seixas", "960 100 204", "Largo de Santa Cristina 2, Viseu", "Visita já executada na demonstração."),
    linha("ord-az-26005", "azul", "AZ-26005", "Águeda", "zn-n04", "eq-litoral", "suporte", null, "2026-10-26", "14:00", "17:30", 45, "alta", "agendada", "Nuno Guedelha", "910 100 205", "Rua do Padrão 31, Águeda", "O técnico marcou a visita como em curso."),
    linha("ord-vr-26006", "vermelho", "VR-26006", "Chaves", "zn-n05", "eq-barroso", "adicional", null, "2026-10-26", "08:30", "13:00", 60, "baixa", "agendada", "Sara Vinagre", "920 100 206", "Rua Direita 19, Chaves", ""),
    linha("ord-az-26007", "azul", "AZ-26007", "Guimarães", "zn-n06", "eq-ave", "adicional", null, "2026-10-26", "14:00", "18:00", 60, "media", "agendada", "Miguel Pestana", "930 100 207", "Alameda de São Dâmaso 7, Guimarães", ""),

    linha("ord-az-24081", "azul", "AZ-24081", "Braga", "zn-n01", "eq-minho", "instalacao", null, DATA_DEMONSTRACAO, "10:00", "12:00", 180, "alta", "agendada", "Leonor Campos", "910 240 081", "Rua das Camélias 18, Braga", "Instalação de 3 h. Começar às 10:00 ocupa a equipa até às 13:00."),
    linha("ord-vr-90001", "vermelho", "VR-90001", "Braga", "zn-n01", "eq-minho", "instalacao", null, DATA_DEMONSTRACAO, "09:00", "12:00", 155, "alta", "agendada", "Duarte Pimentel", "920 900 001", "Avenida Central 240, Braga", "Cabe com a instalação azul se o início desta deslizar dentro da janela."),
    linha("ord-az-24120", "azul", "AZ-24120", "Barcelos", "zn-n02", "eq-cavado", "instalacao", null, DATA_DEMONSTRACAO, "08:00", "10:00", 180, "media", "agendada", "Ana Roriz", "910 241 120", "Rua Fernando Magalhães 42, Barcelos", ""),
    linha("ord-vr-88350", "vermelho", "VR-88350", "Barcelos", "zn-n02", "eq-cavado", "adicional", null, DATA_DEMONSTRACAO, "14:00", "18:00", 60, "baixa", "agendada", "Paulo Gameiro", "920 883 500", "Campo da Feira 9, Barcelos", "A formação das 12:00 às 14:00 impede encaixar aqui a instalação das 09:00."),
    linha("ord-vr-88311", "vermelho", "VR-88311", "Vila Real", "zn-n03", "eq-douro", "instalacao", null, DATA_DEMONSTRACAO, "09:00", "12:00", 155, "media", "agendada", "Filipa Sardo", "920 883 110", "Rua do Rossio 16, Vila Real", ""),
    linha("ord-vd-55210", "verde", "VD-55210", "Vila Real", "zn-n03", "eq-douro", "instalacao", "FTTH", DATA_DEMONSTRACAO, "13:00", "18:00", 130, "media", "agendada", "Gonçalo Bentes", "960 552 100", "Avenida Carvalho Araújo 70, Vila Real", ""),
    linha("ord-az-24090", "azul", "AZ-24090", "Vila Real", "zn-n03", "eq-douro", "suporte", null, DATA_DEMONSTRACAO, "14:00", "17:30", 45, "alta", "agendada", "Nádia Calçada", "910 240 090", "Travessa do Carvalho 3, Vila Real", ""),
    linha("ord-az-24102", "azul", "AZ-24102", "Viseu", "zn-c01", "eq-beiras", "instalacao", null, DATA_DEMONSTRACAO, "08:00", "10:00", 180, "media", "agendada", "Tiago Furtado", "910 241 020", "Rua Formosa 55, Viseu", ""),
    linha("ord-vr-88340", "vermelho", "VR-88340", "Viseu", "zn-c01", "eq-beiras", "suporte", null, DATA_DEMONSTRACAO, "11:00", "13:00", 100, "media", "agendada", "Inês Valadares", "920 883 400", "Avenida da Bélgica 12, Viseu", ""),
    linha("ord-vd-55240", "verde", "VD-55240", "Guarda", "zn-c01", "eq-beiras", "suporte", "CABO", DATA_DEMONSTRACAO, "13:00", "18:00", 40, "baixa", "agendada", "Martim Coelho", "960 552 400", "Rua do Comércio 8, Guarda", ""),
    linha("ord-az-24110", "azul", "AZ-24110", "Covilhã", "zn-c01", "eq-beiras", "adicional", null, DATA_DEMONSTRACAO, "17:00", "19:00", 60, "baixa", "agendada", "Olívia Branco", "910 241 100", "Largo do Município 1, Covilhã", ""),
    linha("ord-vd-55280", "verde", "VD-55280", "Aveiro", "zn-n04", "eq-litoral", "instalacao", "ALARMES", DATA_DEMONSTRACAO, "08:00", "13:00", 150, "alta", "agendada", "Diogo Lameira", "960 552 800", "Rua de Coimbra 27, Aveiro", ""),
    linha("ord-az-24140", "azul", "AZ-24140", "Águeda", "zn-n04", "eq-litoral", "suporte", null, DATA_DEMONSTRACAO, "14:00", "17:30", 45, "media", "agendada", "Helena Pires", "910 241 400", "Rua Luís de Camões 6, Águeda", ""),
    linha("ord-vr-88390", "vermelho", "VR-88390", "Chaves", "zn-n05", "eq-barroso", "suporte", null, DATA_DEMONSTRACAO, "09:00", "11:00", 100, "media", "agendada", "Rui Taborda", "920 883 900", "Rua de Santo António 21, Chaves", ""),
    linha("ord-vd-55300", "verde", "VD-55300", "Chaves", "zn-n05", "eq-barroso", "instalacao", "DTH", DATA_DEMONSTRACAO, "13:00", "18:00", 90, "baixa", "agendada", "Clara Dinis", "960 553 000", "Avenida dos Bombeiros 4, Chaves", ""),
    linha("ord-az-27020", "azul", "AZ-27020", "Guimarães", "zn-n06", "eq-ave", "adicional", null, DATA_DEMONSTRACAO, "14:00", "18:00", 60, "baixa", "agendada", "Simão Leal", "910 270 200", "Rua da Rainha 33, Guimarães", "A manhã fica livre para receber uma instalação vinda da Equipa Minho."),

    linha("ord-az-24160", "azul", "AZ-24160", "Guimarães", "zn-n06", "eq-minho", "suporte", null, "2026-10-28", "08:00", "12:30", 45, "media", "agendada", "Matilde Noronha", "910 241 600", "Rua de Camões 10, Guimarães", ""),
    linha("ord-vr-88420", "vermelho", "VR-88420", "Guimarães", "zn-n06", "eq-minho", "instalacao", null, "2026-10-28", "14:00", "17:00", 155, "media", "agendada", "Afonso Ribeiro", "920 884 200", "Avenida Conde de Margaride 15, Guimarães", ""),

    linha("ord-vd-urg", "verde", "VD-URG", "Braga", "zn-n01", null, "instalacao", "FTTH", DATA_DEMONSTRACAO, "08:00", "13:00", 130, "alta", "em_espera", "Matilde Queirós", "960 000 187", "Rua do Souto 7, Braga", "Não cabe na Equipa Minho enquanto a instalação azul e a vermelha dividem o dia."),
    linha("ord-vr-fila-01", "vermelho", "VR-FILA-01", "Chaves", "zn-n05", null, "instalacao", null, DATA_DEMONSTRACAO, "14:00", "17:00", 155, "media", "em_espera", "Lourenço Paiva", "920 441 010", "Rua do Sol 11, Chaves", "À espera de um intervalo na Equipa Barroso."),
    linha("ord-az-fila-01", "azul", "AZ-FILA-01", "Guarda", "zn-c01", null, "adicional", null, DATA_DEMONSTRACAO, "19:00", "21:00", 60, "baixa", "em_espera", "Diana Falcão", "910 441 020", "Rua do Ferrador 4, Guarda", "Trabalho adicional, sem urgência."),
    linha("ord-vd-fila-01", "verde", "VD-FILA-01", "Aveiro", "zn-n04", null, "suporte", "FTTH", DATA_DEMONSTRACAO, "13:00", "18:00", 40, "media", "em_espera", "Ivo Salgado", "960 441 030", "Rua de Ovar 18, Aveiro", "A Equipa Litoral já tem alarmes de manhã."),
    linha("ord-az-pend-01", "azul", "AZ-PEND-01", "Braga", "zn-n01", null, "instalacao", null, DATA_DEMONSTRACAO, "13:00", "15:00", 180, "media", "pendente", "Teresa Malhoa", "910 550 010", "Rua dos Chãos 22, Braga", "Registada pelo despachante, ainda sem tentativa de encaixe."),
    linha("ord-vr-canc-01", "vermelho", "VR-CANC-01", "Braga", "zn-n01", "eq-minho", "suporte", null, DATA_DEMONSTRACAO, "16:00", "18:00", 100, "baixa", "cancelada", "Eduardo Vilar", "920 660 010", "Rua de São Marcos 9, Braga", ""),
  ];
  return linhas.map(rascunho);
}

function linha(
  id: string,
  operadorId: OperadorId,
  referencia: string,
  area: string,
  zonaId: string,
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
  clienteContacto: string,
  morada: string,
  nota: string,
): Rascunho {
  return {
    id,
    operadorId,
    referencia,
    area,
    zonaId,
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
    clienteContacto,
    morada,
    nota,
  };
}

export function criarMundoDemonstracao(): Mundo {
  let mundo: Mundo = {
    equipas: equipasDemonstracao(),
    ordens: ordensIniciais(),
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
  return [
    { id: "rg-norte", nome: "Norte" },
    { id: "rg-centro", nome: "Centro" },
  ];
}

export function zonasDemonstracao(): ZonaDemo[] {
  return [
    { id: "zn-n01", regiaoId: "rg-norte", codigo: "N01", nome: "Braga" },
    { id: "zn-n02", regiaoId: "rg-norte", codigo: "N02", nome: "Cávado" },
    { id: "zn-n03", regiaoId: "rg-norte", codigo: "N03", nome: "Douro" },
    { id: "zn-n04", regiaoId: "rg-norte", codigo: "N04", nome: "Litoral" },
    { id: "zn-n05", regiaoId: "rg-norte", codigo: "N05", nome: "Barroso" },
    { id: "zn-n06", regiaoId: "rg-norte", codigo: "N06", nome: "Guimarães" },
    { id: "zn-c01", regiaoId: "rg-centro", codigo: "C01", nome: "Beiras" },
  ];
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

export function vigenciasDemonstracao(): VigenciaDemo[] {
  return equipasDemonstracao().map((equipa) => ({
    id: `vig-${equipa.id}`,
    equipaId: equipa.id,
    zonaId:
      {
        "eq-minho": "zn-n01",
        "eq-ave": "zn-n06",
        "eq-cavado": "zn-n02",
        "eq-douro": "zn-n03",
        "eq-litoral": "zn-n04",
        "eq-barroso": "zn-n05",
        "eq-beiras": "zn-c01",
      }[equipa.id] ?? "zn-n01",
    inicio: "2026-01-01",
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

export function historicoDemonstracao(): HistoricoDemo[] {
  return [
    {
      id: "his-az-24081",
      ordemId: "ord-az-24081",
      quando: CRIADA,
      acao: "criada",
      detalhe: "Ordem de demonstração marcada na Equipa Minho.",
    },
    {
      id: "his-vd-urg",
      ordemId: "ord-vd-urg",
      quando: CRIADA,
      acao: "fila",
      detalhe: "Ficou em fila de espera: a Equipa Minho não fecha o dia com as três instalações.",
    },
    {
      id: "his-vr-canc",
      ordemId: "ord-vr-canc-01",
      quando: "2026-10-26T11:00:00.000Z",
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
