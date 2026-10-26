import type { Categoria, EstadoOrdem, OperadorId, Papel, Prioridade, Tecnologia } from "./tipos";

export const NOME_OPERADOR: Record<OperadorId, string> = {
  azul: "Operador Azul",
  vermelho: "Operador Vermelho",
  verde: "Operador Verde",
};

export const COR_OPERADOR: Record<OperadorId, string> = {
  azul: "#1d4f91",
  vermelho: "#a32020",
  verde: "#1d7a45",
};

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  instalacao: "Instalação",
  suporte: "Suporte",
  adicional: "Trabalho adicional",
  desligamento: "Desligamento",
};

export const ROTULO_ESTADO: Record<EstadoOrdem, string> = {
  pendente: "Pendente",
  agendada: "Agendada",
  em_curso: "Em curso",
  concluida: "Concluída",
  cancelada: "Cancelada",
  em_espera: "Em fila de espera",
};

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  despachante: "Despachante",
  tecnico: "Técnico",
};

export const ROTULO_TECNOLOGIA: Record<Tecnologia, string> = {
  FTTH: "FTTH",
  CABO: "Cabo",
  DTH: "DTH",
  SEA: "SEA",
  ALARMES: "Alarmes",
};

export const ROTULO_VAGA = {
  disponivel: "Disponível",
  opcional: "Opcional",
  indisponivel: "Indisponível",
} as const;

export const ROTULO_QUEM = {
  operador: "Operador",
  cliente: "Cliente",
  central: "Central",
} as const;
