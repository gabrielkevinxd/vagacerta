import { detetarConflitos, type Conflito } from "./dia";
import { eCentral, podeReagendar, vistaDaOrdem, type Ator } from "./permissoes";
import { linhasDoDia, type BlocoPlano, type LinhaEquipa, type Movimento, type PlanoReencaixe } from "./reencaixe";
import { somarDias } from "./tempo";
import type { Categoria, EstadoOrdem, Mundo, OperadorId, Prioridade } from "./tipos";

export interface BlocoVista {
  id: string;
  inicio: string;
  fim: string;
  inicioMin: number;
  fimMin: number;
  duracaoMin: number;
  vista: "completa" | "ocupada";
  arrastavel: boolean;
  referencia?: string;
  operadorId?: OperadorId;
  clienteNome?: string;
  morada?: string;
  janelaInicio?: string;
  janelaFim?: string;
  categoria?: Categoria;
  estado?: EstadoOrdem;
  prioridade?: Prioridade;
}

export interface IndisponibilidadeVista {
  inicio: string;
  fim: string;
  inicioMin: number;
  fimMin: number;
  motivo: string;
}

export interface LinhaVista {
  equipaId: string;
  nome: string;
  codigo: string;
  turno: { inicio: string; fim: string } | null;
  indisponibilidades: IndisponibilidadeVista[];
  blocos: BlocoVista[];
  conflitos: Conflito[];
}

export interface Agenda {
  de: string;
  ate: string;
  margemDeslocacaoMin: number;
  dias: { data: string; equipas: LinhaVista[] }[];
}

function projetarBloco(bloco: BlocoPlano, ator: Ator): BlocoVista | null {
  const vista = vistaDaOrdem(ator, { operadorId: bloco.operadorId, equipaId: "ignorado" });
  if (ator.papel === "tecnico") {
    // O técnico executa as visitas da própria equipa, de qualquer operador.
    // A chamada acima usa a equipa errada de propósito: o filtro de equipa é da linha.
  }
  const vistaFinal = ator.papel === "tecnico" ? "completa" : vista === "oculta" ? "ocupada" : vista;
  if (vistaFinal === "ocupada" && ator.papel === "tecnico") return null;
  const base: BlocoVista = {
    id: bloco.id,
    inicio: bloco.inicio,
    fim: bloco.fim,
    inicioMin: bloco.inicioMin,
    fimMin: bloco.fimMin,
    duracaoMin: bloco.duracaoMin,
    vista: vistaFinal === "completa" ? "completa" : "ocupada",
    arrastavel: false,
  };
  if (base.vista === "ocupada") return base;
  return {
    ...base,
    arrastavel: podeReagendar(ator, { operadorId: bloco.operadorId, equipaId: null, estado: bloco.estado }),
    referencia: bloco.referencia,
    operadorId: bloco.operadorId,
    clienteNome: bloco.clienteNome,
    morada: bloco.morada,
    janelaInicio: bloco.janelaInicio,
    janelaFim: bloco.janelaFim,
    categoria: bloco.categoria,
    estado: bloco.estado,
    prioridade: bloco.prioridade,
  };
}

function projetarLinha(mundo: Mundo, linha: LinhaEquipa, ator: Ator, data: string): LinhaVista | null {
  if (ator.papel === "tecnico" && ator.equipaId !== linha.equipaId) return null;
  const blocos = linha.blocos
    .map((bloco) => {
      if (ator.papel === "despachante") {
        const vista = vistaDaOrdem(ator, { operadorId: bloco.operadorId, equipaId: linha.equipaId });
        if (vista === "completa") return projetarBloco(bloco, ator);
        return {
          id: bloco.id,
          inicio: bloco.inicio,
          fim: bloco.fim,
          inicioMin: bloco.inicioMin,
          fimMin: bloco.fimMin,
          duracaoMin: bloco.duracaoMin,
          vista: "ocupada" as const,
          arrastavel: false,
        };
      }
      return projetarBloco(bloco, ator);
    })
    .filter((bloco): bloco is BlocoVista => bloco !== null);

  const conflitos = detetarConflitos(mundo, linha.equipaId, data).filter((conflito) => {
    if (eCentral(ator) || ator.papel === "tecnico") return true;
    return blocos.some((bloco) => bloco.vista === "completa" && bloco.id === conflito.ordemId);
  });

  return {
    equipaId: linha.equipaId,
    nome: linha.nome,
    codigo: linha.codigo,
    turno: linha.turno,
    indisponibilidades: linha.indisponibilidades,
    blocos,
    conflitos,
  };
}

export function projetarAgenda(mundo: Mundo, ator: Ator, de: string, ate: string): Agenda {
  const dias: Agenda["dias"] = [];
  let cursor = de;
  let guarda = 0;
  while (cursor <= ate && guarda < 21) {
    const equipas = linhasDoDia(mundo, cursor)
      .map((linha) => projetarLinha(mundo, linha, ator, cursor))
      .filter((linha): linha is LinhaVista => linha !== null);
    dias.push({ data: cursor, equipas });
    cursor = somarDias(cursor, 1);
    guarda += 1;
  }
  return { de, ate, margemDeslocacaoMin: mundo.margemDeslocacaoMin, dias };
}

export interface MovimentoVista {
  tipo: Movimento["tipo"];
  referencia: string;
  ordemId: string;
  deEquipaId: string | null;
  paraEquipaId: string | null;
  motivo: string;
}

export interface PlanoVista {
  viavel: boolean;
  mensagem: string;
  data: string;
  selo: string;
  movimentos: MovimentoVista[];
  antes: LinhaVista[];
  depois: LinhaVista[];
}

const MOTIVO_OCULTO: Record<Movimento["tipo"], string> = {
  cancelar: "Uma visita de outro operador deixa de ocupar a equipa.",
  reagendar: "Uma visita de outro operador muda de equipa.",
  encaixar: "Uma ordem de outro operador entra numa equipa.",
  devolver: "Uma ordem de outro operador volta à fila de espera.",
};

export function projetarPlano(
  mundoAntes: Mundo,
  mundoDepois: Mundo,
  plano: PlanoReencaixe,
  ator: Ator,
  selo: string,
): PlanoVista {
  const movimentos = plano.movimentos.map((movimento) => {
    const ordem =
      mundoAntes.ordens.find((linha) => linha.id === movimento.ordemId) ??
      mundoDepois.ordens.find((linha) => linha.id === movimento.ordemId);
    const podeVer = ordem ? vistaDaOrdem(ator, ordem) === "completa" || (ator.papel === "tecnico" && ordem.equipaId === ator.equipaId) : eCentral(ator);
    if (eCentral(ator) || podeVer) return movimento;
    return {
      tipo: movimento.tipo,
      referencia: "Outro operador",
      ordemId: "",
      deEquipaId: movimento.deEquipaId,
      paraEquipaId: movimento.paraEquipaId,
      motivo: MOTIVO_OCULTO[movimento.tipo],
    };
  });
  return {
    viavel: plano.viavel,
    mensagem: eCentral(ator) ? plano.mensagem : mensagemParaDespachante(plano, ator, mundoAntes),
    data: plano.data,
    selo,
    movimentos,
    antes: linhasDoDia(mundoAntes, plano.data)
      .map((linha) => projetarLinha(mundoAntes, linha, ator, plano.data))
      .filter((linha): linha is LinhaVista => linha !== null),
    depois: linhasDoDia(mundoDepois, plano.data)
      .map((linha) => projetarLinha(mundoDepois, linha, ator, plano.data))
      .filter((linha): linha is LinhaVista => linha !== null),
  };
}

function mensagemParaDespachante(plano: PlanoReencaixe, ator: Ator, mundo: Mundo): string {
  if (!plano.viavel) return plano.mensagem;
  const proprias = plano.movimentos.filter((movimento) => {
    const ordem = mundo.ordens.find((linha) => linha.id === movimento.ordemId);
    return ordem && ordem.operadorId === ator.operadorId;
  });
  if (proprias.length === 0 && plano.movimentos.length > 0) {
    return "A capacidade partilhada foi reorganizada. Os dados dos outros operadores ficam ocultos.";
  }
  return plano.mensagem
    .split(/(?<=\.)\s+/)
    .filter((frase) => {
      const referencias = mundo.ordens.filter((ordem) => ordem.operadorId !== ator.operadorId).map((ordem) => ordem.referencia);
      return !referencias.some((referencia) => frase.includes(referencia));
    })
    .join(" ");
}
