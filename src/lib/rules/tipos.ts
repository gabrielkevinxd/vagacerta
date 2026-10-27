export const OPERADORES = ["azul", "vermelho", "verde"] as const;
export type OperadorId = (typeof OPERADORES)[number];

export const CATEGORIAS = ["instalacao", "suporte", "adicional", "desligamento"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const TECNOLOGIAS = ["FTTH", "CABO", "DTH", "SEA", "ALARMES"] as const;
export type Tecnologia = (typeof TECNOLOGIAS)[number];

export const ESTADOS_ORDEM = [
  "pendente",
  "agendada",
  "em_curso",
  "concluida",
  "cancelada",
  "em_espera",
] as const;
export type EstadoOrdem = (typeof ESTADOS_ORDEM)[number];

export const PRIORIDADES = ["alta", "media", "baixa"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const PAPEIS = ["administrador", "supervisor", "despachante", "tecnico"] as const;
export type Papel = (typeof PAPEIS)[number];

export const QUEM_PEDIU = ["operador", "cliente", "central"] as const;
export type QuemPediu = (typeof QUEM_PEDIU)[number];

export const ESTADOS_QUE_OCUPAM: readonly EstadoOrdem[] = ["agendada", "em_curso", "concluida"];

export interface Competencia {
  operadorId: OperadorId;
  categorias: Categoria[];
  tecnologias: Tecnologia[];
}

export interface Horario {
  /** 1 = segunda … 7 = domingo. */
  diaSemana: number;
  inicio: string;
  fim: string;
}

export interface Indisponibilidade {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  motivo: string;
}

export interface Equipa {
  id: string;
  codigo: string;
  nome: string;
  base: string;
  areas: string[];
  ativa: boolean;
  /** Operadores que esta equipa serve (1–3). Default = os três. Nunca vazio. */
  operadoresServidos: OperadorId[];
  competencias: Competencia[];
  horarios: Horario[];
  indisponibilidades: Indisponibilidade[];
}

export interface Ordem {
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
  estado: EstadoOrdem;
  inicioPlaneado: string | null;
  fimPlaneado: string | null;
  /** Quando verdadeiro, o início planeado não desliza no recálculo. */
  inicioFixado: boolean;
  clienteNome: string;
  clienteContacto: string;
  morada: string;
  nota: string;
  motivoCancelamento: string | null;
  quemPediu: QuemPediu | null;
}

export interface Mundo {
  equipas: Equipa[];
  ordens: Ordem[];
  margemDeslocacaoMin: number;
}

/** Trabalho visto pelo resolvedor. As janelas são minutos de início, inclusive. */
export interface Trabalho {
  id: string;
  janelaInicio: number;
  janelaFim: number;
  duracao: number;
}

export interface BlocoTempo {
  inicio: number;
  fim: number;
}

export interface Restricoes {
  inicioTurno: number;
  /** A ocupação tem de terminar a esta hora ou antes. */
  fimTurno: number;
  blocos: BlocoTempo[];
  margemDeslocacaoMin: number;
}

export interface TrabalhoPlaneado {
  id: string;
  inicio: number;
  fim: number;
}

export interface Falha {
  ok: false;
  codigo: string;
  mensagem: string;
}

export interface Sucesso<T> {
  ok: true;
  mundo: Mundo;
  resultado: T;
}

export type Resultado<T> = Sucesso<T> | Falha;

export function falha(codigo: string, mensagem: string): Falha {
  return { ok: false, codigo, mensagem };
}

export function ocupaCapacidade(estado: EstadoOrdem): boolean {
  return ESTADOS_QUE_OCUPAM.includes(estado);
}
