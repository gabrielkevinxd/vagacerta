import { parseHHMM } from "./tempo";
import { cancelarOrdem, diaAceita, equipaCobre, ordensDoDia, recalcularDia, validarCatalogo } from "./dia";
import { estadoCancelavel } from "./permissoes";
import { diaSemanaIso } from "./tempo";
import {
  falha,
  ocupaCapacidade,
  type Equipa,
  type Mundo,
  type OperadorId,
  type Ordem,
  type QuemPediu,
  type Resultado,
  type Trabalho,
} from "./tipos";

/**
 * Heurística por cima do resolvedor de sequências. Cada movimento é uma
 * operação que a API já aceita: cancelar, reagendar ou encaixar.
 * No máximo uma troca de equipa por pedido, para o plano continuar legível.
 * O resolvedor é o oráculo: um plano que ele recusa não se publica.
 */

export interface Movimento {
  tipo: "cancelar" | "reagendar" | "encaixar" | "devolver";
  referencia: string;
  ordemId: string;
  deEquipaId: string | null;
  paraEquipaId: string | null;
  motivo: string;
}

export interface BlocoPlano {
  id: string;
  referencia: string;
  operadorId: OperadorId;
  inicio: string;
  fim: string;
  inicioMin: number;
  fimMin: number;
  categoria: Ordem["categoria"];
  estado: Ordem["estado"];
  clienteNome: string;
  morada: string;
  janelaInicio: string;
  janelaFim: string;
  prioridade: Ordem["prioridade"];
  duracaoMin: number;
}

export interface LinhaEquipa {
  equipaId: string;
  nome: string;
  codigo: string;
  turno: { inicio: string; fim: string } | null;
  blocos: BlocoPlano[];
  indisponibilidades: { inicio: string; fim: string; inicioMin: number; fimMin: number; motivo: string }[];
}

export interface PlanoReencaixe {
  viavel: boolean;
  mensagem: string;
  movimentos: Movimento[];
  antes: LinhaEquipa[];
  depois: LinhaEquipa[];
  data: string;
  /** Assinatura estável dos movimentos. O servidor sela-a; o cliente não a interpreta. */
  impressao: string;
}

export interface PedidoRealocacao {
  cancelarId?: string;
  encaixarId?: string;
  /** Equipa que não trabalha neste dia. As visitas saem para outra equipa ou voltam à fila. */
  equipaEmFalta?: string;
  permitirTroca?: boolean;
  apenasReferencias?: string[];
  /** Quando presente, a fila e as trocas só mexem em ordens deste operador. */
  apenasDoOperador?: OperadorId;
  motivo?: string;
  quemPediu?: QuemPediu;
  data?: string;
}

const PESO_PRIORIDADE = { alta: 0, media: 1, baixa: 2 } as const;

export function linhasDoDia(mundo: Mundo, data: string): LinhaEquipa[] {
  return mundo.equipas.map((equipa) => {
    const horario = equipa.horarios.find((linha) => linha.diaSemana === diaSemanaIso(data));
    const blocos = ordensDoDia(mundo, equipa.id, data)
      .filter((ordem) => ordem.inicioPlaneado && ordem.fimPlaneado)
      .map((ordem) => ({
        id: ordem.id,
        referencia: ordem.referencia,
        operadorId: ordem.operadorId,
        inicio: ordem.inicioPlaneado!,
        fim: ordem.fimPlaneado!,
        inicioMin: parseHHMM(ordem.inicioPlaneado!),
        fimMin: parseHHMM(ordem.fimPlaneado!),
        categoria: ordem.categoria,
        estado: ordem.estado,
        clienteNome: ordem.clienteNome,
        morada: ordem.morada,
        janelaInicio: ordem.janelaInicio,
        janelaFim: ordem.janelaFim,
        prioridade: ordem.prioridade,
        duracaoMin: ordem.duracaoMin,
      }))
      .sort((a, b) => a.inicioMin - b.inicioMin || a.referencia.localeCompare(b.referencia));
    const indisponibilidades = equipa.indisponibilidades
      .filter((linha) => linha.data === data)
      .map((linha) => ({
        inicio: linha.inicio,
        fim: linha.fim,
        inicioMin: parseHHMM(linha.inicio),
        fimMin: parseHHMM(linha.fim),
        motivo: linha.motivo,
      }));
    return {
      equipaId: equipa.id,
      nome: equipa.nome,
      codigo: equipa.codigo,
      turno: horario ? { inicio: horario.inicio, fim: horario.fim } : null,
      blocos,
      indisponibilidades,
    };
  });
}

export function impressaoPlano(movimentos: Movimento[]): string {
  return movimentos.map((movimento) => `${movimento.tipo}:${movimento.ordemId}:${movimento.paraEquipaId ?? ""}`).join("|");
}

function carga(mundo: Mundo, equipaId: string, data: string): number {
  return ordensDoDia(mundo, equipaId, data).reduce((soma, ordem) => soma + ordem.duracaoMin, 0);
}

function nomeEquipa(mundo: Mundo, equipaId: string | null): string {
  if (!equipaId) return "equipa";
  return mundo.equipas.find((equipa) => equipa.id === equipaId)?.nome ?? equipaId;
}

function trabalhoDaFila(ordem: Ordem): Trabalho | null {
  const catalogo = validarCatalogo(ordem.operadorId, ordem.categoria, ordem.tecnologia, ordem.janelaInicio, ordem.janelaFim);
  if ("ok" in catalogo) return null;
  return {
    id: ordem.id,
    janelaInicio: parseHHMM(ordem.janelaInicio),
    janelaFim: parseHHMM(ordem.janelaFim),
    duracao: ordem.duracaoMin,
  };
}

function movimentoCancelar(ordem: Ordem, motivo: string): Movimento {
  return {
    tipo: "cancelar",
    referencia: ordem.referencia,
    ordemId: ordem.id,
    deEquipaId: ordem.equipaId,
    paraEquipaId: null,
    motivo,
  };
}

function movimentoReagendar(ordem: Ordem, destinoId: string): Movimento {
  return {
    tipo: "reagendar",
    referencia: ordem.referencia,
    ordemId: ordem.id,
    deEquipaId: ordem.equipaId,
    paraEquipaId: destinoId,
    motivo: `${ordem.referencia} muda de equipa para libertar a sequência.`,
  };
}

function movimentoEncaixar(ordem: Ordem, equipaId: string): Movimento {
  return {
    tipo: "encaixar",
    referencia: ordem.referencia,
    ordemId: ordem.id,
    deEquipaId: null,
    paraEquipaId: equipaId,
    motivo: `${ordem.referencia} sai da fila e entra na equipa que ainda tem sequência.`,
  };
}

function gravarEncaixe(mundo: Mundo, ordemId: string, equipaId: string): Mundo {
  const seguinte = structuredClone(mundo);
  const ordem = seguinte.ordens.find((linha) => linha.id === ordemId);
  if (!ordem) return seguinte;
  ordem.estado = "agendada";
  ordem.equipaId = equipaId;
  ordem.inicioPlaneado = null;
  ordem.fimPlaneado = null;
  ordem.inicioFixado = false;
  ordem.motivoCancelamento = null;
  ordem.quemPediu = null;
  return recalcularDia(seguinte, equipaId, ordem.data);
}

function destinosCapazes(mundo: Mundo, ordem: Ordem): Equipa[] {
  return mundo.equipas
    .filter((equipa) => equipaCobre(equipa, ordem.operadorId, ordem.categoria, ordem.tecnologia, ordem.area))
    .sort((a, b) => carga(mundo, a.id, ordem.data) - carga(mundo, b.id, ordem.data) || a.id.localeCompare(b.id));
}

function encaixarItem(mundo: Mundo, ordem: Ordem): { mundo: Mundo; equipaId: string } | null {
  const trabalho = trabalhoDaFila(ordem);
  if (!trabalho) return null;
  for (const equipa of destinosCapazes(mundo, ordem)) {
    if (!diaAceita(mundo, equipa.id, ordem.data, [trabalho])) continue;
    return { mundo: gravarEncaixe(mundo, ordem.id, equipa.id), equipaId: equipa.id };
  }
  return null;
}

function podeMexer(ordem: Ordem, pedido: PedidoRealocacao): boolean {
  if (pedido.apenasDoOperador && ordem.operadorId !== pedido.apenasDoOperador) return false;
  return true;
}

function trocarParaEncaixar(
  mundo: Mundo,
  ordem: Ordem,
  pedido: PedidoRealocacao,
): { mundo: Mundo; movimento: Movimento; equipaId: string } | null {
  const trabalho = trabalhoDaFila(ordem);
  if (!trabalho) return null;
  const anfitrioes = mundo.equipas.filter((equipa) =>
    equipaCobre(equipa, ordem.operadorId, ordem.categoria, ordem.tecnologia, ordem.area),
  );
  for (const anfitriao of anfitrioes) {
    const marcadas = ordensDoDia(mundo, anfitriao.id, ordem.data)
      .filter((marcada) => marcada.estado === "agendada" && !marcada.inicioFixado && podeMexer(marcada, pedido))
      .sort((a, b) => a.janelaInicio.localeCompare(b.janelaInicio) || a.referencia.localeCompare(b.referencia));
    for (const marcada of marcadas) {
      const destinos = mundo.equipas
        .filter(
          (equipa) =>
            equipa.id !== anfitriao.id &&
            equipaCobre(equipa, marcada.operadorId, marcada.categoria, marcada.tecnologia, marcada.area),
        )
        .sort((a, b) => carga(mundo, a.id, marcada.data) - carga(mundo, b.id, marcada.data) || a.id.localeCompare(b.id));
      for (const destino of destinos) {
        const ensaio = structuredClone(mundo);
        const movida = ensaio.ordens.find((linha) => linha.id === marcada.id);
        if (!movida) continue;
        movida.equipaId = destino.id;
        movida.inicioPlaneado = null;
        movida.fimPlaneado = null;
        movida.inicioFixado = false;
        if (!diaAceita(ensaio, destino.id, marcada.data)) continue;
        if (!diaAceita(ensaio, anfitriao.id, marcada.data)) continue;
        if (!diaAceita(ensaio, anfitriao.id, ordem.data, [trabalho])) continue;
        let seguinte = recalcularDia(ensaio, destino.id, marcada.data);
        if (anfitriao.id !== destino.id || marcada.data !== ordem.data) {
          seguinte = recalcularDia(seguinte, anfitriao.id, marcada.data);
        }
        const encaixe = encaixarItem(seguinte, ordem);
        if (!encaixe || encaixe.equipaId !== anfitriao.id) continue;
        return { mundo: encaixe.mundo, movimento: movimentoReagendar(marcada, destino.id), equipaId: encaixe.equipaId };
      }
    }
  }
  return null;
}

function filaElegivel(mundo: Mundo, filtro: { data: string; areas: string[]; pedido: PedidoRealocacao }): Ordem[] {
  const referencias = filtro.pedido.apenasReferencias?.map((referencia) => referencia.toLowerCase());
  return mundo.ordens
    .filter((ordem) => ordem.estado === "em_espera" && ordem.data === filtro.data && filtro.areas.includes(ordem.area))
    .filter((ordem) => !filtro.pedido.apenasDoOperador || ordem.operadorId === filtro.pedido.apenasDoOperador)
    .filter((ordem) => !referencias || referencias.includes(ordem.referencia.toLowerCase()))
    .sort(
      (a, b) =>
        PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
        a.janelaInicio.localeCompare(b.janelaInicio) ||
        a.referencia.localeCompare(b.referencia),
    );
}

function fechar(
  viavel: boolean,
  antes: Mundo,
  depois: Mundo,
  movimentos: Movimento[],
  data: string,
  mensagem: string,
): PlanoReencaixe & { mundo: Mundo } {
  return {
    viavel,
    mensagem,
    movimentos,
    antes: linhasDoDia(antes, data),
    depois: linhasDoDia(depois, data),
    data,
    impressao: impressaoPlano(movimentos),
    mundo: depois,
  };
}

function narrar(antes: Mundo, depois: Mundo, movimentos: Movimento[], data: string): string {
  const frases: string[] = [];
  for (const movimento of movimentos) {
    if (movimento.tipo === "cancelar") {
      frases.push(`A ${movimento.referencia} sai da ${nomeEquipa(antes, movimento.deEquipaId)}.`);
    } else if (movimento.tipo === "reagendar") {
      frases.push(`A ${movimento.referencia} passa para a ${nomeEquipa(depois, movimento.paraEquipaId)}.`);
    } else if (movimento.tipo === "devolver") {
      frases.push(`A ${movimento.referencia} volta à fila de espera.`);
    } else {
      const bloco = linhasDoDia(depois, data)
        .flatMap((linha) => linha.blocos)
        .find((linha) => linha.referencia === movimento.referencia);
      frases.push(bloco ? `A ${movimento.referencia} entra às ${bloco.inicio}.` : `A ${movimento.referencia} entra no dia.`);
    }
  }
  const anteriores = linhasDoDia(antes, data).flatMap((linha) => linha.blocos);
  for (const bloco of linhasDoDia(depois, data).flatMap((linha) => linha.blocos)) {
    const anterior = anteriores.find((linha) => linha.id === bloco.id);
    if (anterior && anterior.inicio !== bloco.inicio && !movimentos.some((linha) => linha.referencia === bloco.referencia)) {
      frases.push(`A ${bloco.referencia} passa a começar às ${bloco.inicio}.`);
    }
  }
  return frases.join(" ");
}

function diasFecham(mundo: Mundo, data: string): boolean {
  const visto = new Set<string>();
  let seguinte = structuredClone(mundo);
  for (const ordem of mundo.ordens) {
    if (!ocupaCapacidade(ordem.estado) || !ordem.equipaId || ordem.data !== data) continue;
    const chave = `${ordem.equipaId}|${ordem.data}`;
    if (visto.has(chave)) continue;
    visto.add(chave);
    seguinte = recalcularDia(seguinte, ordem.equipaId, ordem.data);
  }
  return seguinte.ordens.every(
    (ordem) => !ocupaCapacidade(ordem.estado) || ordem.data !== data || ordem.inicioPlaneado !== null,
  );
}

function reencaixarFalta(mundo: Mundo, equipaId: string, data: string, pedido: PedidoRealocacao): PlanoReencaixe & { mundo: Mundo } {
  const equipa = mundo.equipas.find((linha) => linha.id === equipaId);
  if (!equipa) return fechar(false, mundo, mundo, [], data, "Não encontrámos essa equipa.");

  let seguinte = structuredClone(mundo);
  const alvo = seguinte.equipas.find((linha) => linha.id === equipaId)!;
  const horario = alvo.horarios.find((linha) => linha.diaSemana === diaSemanaIso(data));
  const idFalta = `un-falta-${equipaId}-${data}`;
  alvo.indisponibilidades = alvo.indisponibilidades.filter((linha) => linha.id !== idFalta);
  alvo.indisponibilidades.push({
    id: idFalta,
    data,
    inicio: horario?.inicio ?? "00:00",
    fim: horario?.fim ?? "23:59",
    motivo: "Falta da equipa",
  });
  seguinte = recalcularDia(seguinte, equipaId, data);

  const movimentos: Movimento[] = [];
  const ordens = ordensDoDia(mundo, equipaId, data)
    .filter((ordem) => ordem.estado === "agendada" && !ordem.inicioFixado)
    .sort((a, b) => a.referencia.localeCompare(b.referencia));
  for (const ordem of ordens) {
    const trabalho = trabalhoDaFila({ ...ordem, estado: "em_espera", equipaId: null });
    const destinos = trabalho
      ? seguinte.equipas
          .filter(
            (equipaDestino) =>
              equipaDestino.id !== equipaId &&
              equipaCobre(equipaDestino, ordem.operadorId, ordem.categoria, ordem.tecnologia, ordem.area) &&
              diaAceita(seguinte, equipaDestino.id, data, [trabalho]),
          )
          .sort((a, b) => carga(seguinte, a.id, data) - carga(seguinte, b.id, data) || a.id.localeCompare(b.id))
      : [];
    const destino = destinos[0];
    if (destino) {
      const linha = seguinte.ordens.find((item) => item.id === ordem.id)!;
      linha.equipaId = destino.id;
      linha.inicioPlaneado = null;
      linha.fimPlaneado = null;
      linha.inicioFixado = false;
      seguinte = recalcularDia(seguinte, destino.id, data);
      seguinte = recalcularDia(seguinte, equipaId, data);
      movimentos.push(movimentoReagendar(ordem, destino.id));
      continue;
    }
    const linha = seguinte.ordens.find((item) => item.id === ordem.id)!;
    linha.estado = "em_espera";
    linha.equipaId = null;
    linha.inicioPlaneado = null;
    linha.fimPlaneado = null;
    linha.inicioFixado = false;
    seguinte = recalcularDia(seguinte, equipaId, data);
    movimentos.push({
      tipo: "devolver",
      referencia: ordem.referencia,
      ordemId: ordem.id,
      deEquipaId: equipaId,
      paraEquipaId: null,
      motivo: `${ordem.referencia} volta à fila porque ${equipa.nome} falta e nenhuma outra equipa fecha o dia.`,
    });
  }

  const fila = filaElegivel(seguinte, { data, areas: equipa.areas, pedido });
  for (const item of fila) {
    const direto = encaixarItem(seguinte, item);
    if (!direto || direto.equipaId === equipaId) continue;
    seguinte = direto.mundo;
    movimentos.push(movimentoEncaixar(item, direto.equipaId));
  }

  if (!diasFecham(seguinte, data)) {
    return fechar(false, mundo, mundo, [], data, "A falta deixa um dia sem sequência. O plano não se publica.");
  }
  const mensagem = narrar(mundo, seguinte, movimentos, data) || `${equipa.nome} falta e o dia foi refeito com o resolvedor.`;
  return fechar(true, mundo, seguinte, movimentos, data, mensagem);
}

export function reencaixar(mundo: Mundo, pedido: PedidoRealocacao): PlanoReencaixe & { mundo: Mundo } {
  if (pedido.equipaEmFalta) {
    const data = pedido.data ?? mundo.ordens.find((ordem) => ordem.equipaId === pedido.equipaEmFalta)?.data ?? "";
    if (!data) return fechar(false, mundo, mundo, [], pedido.data ?? "", "Indique o dia da falta.");
    return reencaixarFalta(mundo, pedido.equipaEmFalta, data, pedido);
  }

  if (pedido.cancelarId) {
    const ordem = mundo.ordens.find((linha) => linha.id === pedido.cancelarId);
    if (!ordem || !estadoCancelavel(ordem.estado)) {
      return fechar(false, mundo, mundo, [], pedido.data ?? ordem?.data ?? "", "Não encontrámos essa visita marcada.");
    }
    if (pedido.apenasDoOperador && ordem.operadorId !== pedido.apenasDoOperador) {
      return fechar(false, mundo, mundo, [], ordem.data, "Essa ordem é de outro operador.");
    }
    const resultado = cancelarNoMundo(
      mundo,
      ordem.id,
      pedido.motivo ?? "Libertar capacidade para a fila de espera.",
      pedido.quemPediu ?? "central",
    );
    if (!resultado.ok) return fechar(false, mundo, mundo, [], ordem.data, resultado.mensagem);
    let seguinte = resultado.mundo;
    const movimentos = [movimentoCancelar(ordem, pedido.motivo ?? `${ordem.referencia} deixa de ocupar a equipa.`)];
    const equipa = mundo.equipas.find((linha) => linha.id === ordem.equipaId);
    const fila = filaElegivel(seguinte, { data: ordem.data, areas: equipa?.areas ?? [ordem.area], pedido });
    let trocou = false;
    for (const item of fila) {
      const direto = encaixarItem(seguinte, item);
      if (direto) {
        seguinte = direto.mundo;
        movimentos.push(movimentoEncaixar(item, direto.equipaId));
        continue;
      }
      if (pedido.permitirTroca && !trocou) {
        const troca = trocarParaEncaixar(seguinte, item, pedido);
        if (troca) {
          seguinte = troca.mundo;
          movimentos.push(troca.movimento, movimentoEncaixar(item, troca.equipaId));
          trocou = true;
        }
      }
    }
    const mensagem = narrar(mundo, seguinte, movimentos, ordem.data);
    return fechar(true, mundo, seguinte, movimentos, ordem.data, mensagem || "A visita sai e o dia volta a ser sequenciado.");
  }

  if (pedido.encaixarId) {
    const ordem = mundo.ordens.find((linha) => linha.id === pedido.encaixarId && linha.estado === "em_espera");
    const data = ordem?.data ?? pedido.data ?? "";
    if (!ordem) return fechar(false, mundo, mundo, [], data, "Essa ordem já não está na fila.");
    if (pedido.apenasDoOperador && ordem.operadorId !== pedido.apenasDoOperador) {
      return fechar(false, mundo, mundo, [], data, "Essa ordem é de outro operador.");
    }
    const direto = encaixarItem(mundo, ordem);
    if (direto) {
      const movimentos = [movimentoEncaixar(ordem, direto.equipaId)];
      return fechar(true, mundo, direto.mundo, movimentos, ordem.data, narrar(mundo, direto.mundo, movimentos, ordem.data));
    }
    if (pedido.permitirTroca) {
      const troca = trocarParaEncaixar(mundo, ordem, pedido);
      if (troca) {
        const movimentos = [troca.movimento, movimentoEncaixar(ordem, troca.equipaId)];
        return fechar(true, mundo, troca.mundo, movimentos, ordem.data, narrar(mundo, troca.mundo, movimentos, ordem.data));
      }
    }
    return fechar(
      false,
      mundo,
      mundo,
      [],
      ordem.data,
      `Encaixar ${ordem.referencia} não cabe: nenhuma sequência respeita as janelas prometidas.`,
    );
  }

  return fechar(false, mundo, mundo, [], pedido.data ?? "", "Nada a reorganizar.");
}

function cancelarNoMundo(mundo: Mundo, id: string, motivo: string, quemPediu: QuemPediu = "central"): Resultado<Ordem> {
  return cancelarOrdem(mundo, id, motivo, quemPediu);
}

export function aplicarPlano(mundo: Mundo, plano: PlanoReencaixe & { mundo?: Mundo }): Resultado<Mundo> {
  if (!plano.viavel) return falha("INVIAVEL", plano.mensagem);
  if (plano.mundo) return { ok: true, mundo: plano.mundo, resultado: plano.mundo };
  const repetido = reencaixar(mundo, {});
  void repetido;
  return falha("CONFLITO", "O plano não traz o mundo recalculado. Volte a pedir a pré-visualização.");
}
