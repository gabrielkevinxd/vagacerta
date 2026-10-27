import { corresponderJanela, duracaoMinutos } from "./catalogo";
import { formatHHMM, eDataIso, diaSemanaIso, parseHHMM } from "./tempo";
import {
  falha,
  ocupaCapacidade,
  type Categoria,
  type Equipa,
  type Falha,
  type Mundo,
  type OperadorId,
  type Ordem,
  type QuemPediu,
  type Restricoes,
  type Resultado,
  type Tecnologia,
  type Trabalho,
} from "./tipos";
import { resolverSequencia } from "./viabilidade";

export interface EntradaMarcacao {
  operadorId: OperadorId;
  referencia: string;
  area: string;
  zonaId: string;
  categoria: Categoria;
  tecnologia?: Tecnologia | null;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  prioridade: Ordem["prioridade"];
  clienteNome: string;
  clienteContacto: string;
  morada: string;
  nota?: string;
  equipaId?: string | null;
  agora?: string;
}

export interface AlteracaoAgenda {
  equipaId?: string;
  data?: string;
  janelaInicio?: string;
  janelaFim?: string;
  /** Minuto de início obrigatório. `null` liberta o deslize. */
  inicioPlaneado?: string | null;
}

export function ordensDoDia(mundo: Mundo, equipaId: string, data: string): Ordem[] {
  return mundo.ordens.filter(
    (ordem) => ordem.equipaId === equipaId && ordem.data === data && ocupaCapacidade(ordem.estado),
  );
}

export function restricoesDaEquipa(equipa: Equipa, data: string, margemDeslocacaoMin: number): Restricoes | null {
  const horario = equipa.horarios.find((linha) => linha.diaSemana === diaSemanaIso(data));
  if (!horario) return null;
  const blocos = equipa.indisponibilidades
    .filter((linha) => linha.data === data)
    .map((linha) => ({ inicio: parseHHMM(linha.inicio), fim: parseHHMM(linha.fim) }))
    .filter((linha) => linha.fim > linha.inicio);
  return {
    inicioTurno: parseHHMM(horario.inicio),
    fimTurno: parseHHMM(horario.fim),
    blocos,
    margemDeslocacaoMin,
  };
}

export function minutosDeTurno(restricoes: Restricoes): number {
  let amplitude = Math.max(0, restricoes.fimTurno - restricoes.inicioTurno);
  for (const bloco of restricoes.blocos) {
    const inicio = Math.max(bloco.inicio, restricoes.inicioTurno);
    const fim = Math.min(bloco.fim, restricoes.fimTurno);
    if (fim > inicio) amplitude -= fim - inicio;
  }
  return Math.max(amplitude, 0);
}

export function trabalhoDaOrdem(ordem: Pick<Ordem, "id" | "janelaInicio" | "janelaFim" | "duracaoMin" | "inicioPlaneado" | "inicioFixado" | "estado">): Trabalho {
  const fixo =
    (ordem.inicioFixado || ordem.estado === "em_curso" || ordem.estado === "concluida") && ordem.inicioPlaneado;
  if (fixo && ordem.inicioPlaneado) {
    const inicio = parseHHMM(ordem.inicioPlaneado);
    return { id: ordem.id, janelaInicio: inicio, janelaFim: inicio, duracao: ordem.duracaoMin };
  }
  return {
    id: ordem.id,
    janelaInicio: parseHHMM(ordem.janelaInicio),
    janelaFim: parseHHMM(ordem.janelaFim),
    duracao: ordem.duracaoMin,
  };
}

export function equipaCobre(
  equipa: Equipa,
  operadorId: OperadorId,
  categoria: Categoria,
  tecnologia: Tecnologia | null,
  area: string,
): boolean {
  if (!equipa.ativa) return false;
  if (!equipa.areas.includes(area)) return false;
  const competencia = equipa.competencias.find((linha) => linha.operadorId === operadorId);
  if (!competencia || !competencia.categorias.includes(categoria)) return false;
  if (operadorId === "verde") {
    if (!tecnologia || !competencia.tecnologias.includes(tecnologia)) return false;
  }
  return true;
}

export function recalcularDia(mundo: Mundo, equipaId: string, data: string): Mundo {
  const seguinte = structuredClone(mundo);
  const equipa = seguinte.equipas.find((linha) => linha.id === equipaId);
  const ordens = seguinte.ordens.filter(
    (ordem) => ordem.equipaId === equipaId && ordem.data === data && ocupaCapacidade(ordem.estado),
  );
  for (const ordem of ordens) {
    if (ordem.estado === "agendada" && !ordem.inicioFixado) {
      ordem.inicioPlaneado = null;
      ordem.fimPlaneado = null;
    }
  }
  if (!equipa || ordens.length === 0) return seguinte;
  const restricoes = restricoesDaEquipa(equipa, data, seguinte.margemDeslocacaoMin);
  const plano = restricoes ? resolverSequencia(ordens.map(trabalhoDaOrdem), restricoes) : null;
  if (!plano) return seguinte;
  const porId = new Map(plano.map((linha) => [linha.id, linha]));
  for (const ordem of ordens) {
    const planeado = porId.get(ordem.id);
    if (!planeado) continue;
    ordem.inicioPlaneado = formatHHMM(planeado.inicio);
    ordem.fimPlaneado = formatHHMM(planeado.fim);
  }
  return seguinte;
}

export function validarCatalogo(
  operadorId: OperadorId,
  categoria: Categoria,
  tecnologia: Tecnologia | null,
  janelaInicio: string,
  janelaFim: string,
): { duracaoMin: number } | Falha {
  if (operadorId === "verde" && !tecnologia) {
    return falha("TECNOLOGIA_INVALIDA", "O Operador Verde exige uma tecnologia.");
  }
  if (operadorId !== "verde" && tecnologia) {
    return falha("TECNOLOGIA_INVALIDA", "A tecnologia só se aplica ao Operador Verde.");
  }
  const duracaoMin = duracaoMinutos(operadorId, categoria, tecnologia);
  if (duracaoMin === null) {
    return falha("CATEGORIA_INVALIDA", "Este operador não faz este tipo de serviço.");
  }
  if (!corresponderJanela(operadorId, categoria, janelaInicio, janelaFim)) {
    return falha("JANELA_INVALIDA", "A janela de início não está no catálogo deste operador.");
  }
  return { duracaoMin };
}

export function diaAceita(mundo: Mundo, equipaId: string, data: string, extra: Trabalho[] = []): boolean {
  const equipa = mundo.equipas.find((linha) => linha.id === equipaId);
  if (!equipa) return false;
  const restricoes = restricoesDaEquipa(equipa, data, mundo.margemDeslocacaoMin);
  if (!restricoes) return false;
  const trabalhos = ordensDoDia(mundo, equipaId, data).map(trabalhoDaOrdem);
  return resolverSequencia([...trabalhos, ...extra], restricoes) !== null;
}

function carga(mundo: Mundo, equipaId: string, data: string): number {
  return ordensDoDia(mundo, equipaId, data).reduce((soma, ordem) => soma + ordem.duracaoMin, 0);
}

export function marcarOrdem(mundo: Mundo, entrada: EntradaMarcacao, id = `ord-${crypto.randomUUID()}`): Resultado<Ordem> {
  if (!eDataIso(entrada.data)) return falha("DATA_INVALIDA", "A data tem de estar no formato AAAA-MM-DD.");
  const referencia = entrada.referencia.trim();
  if (!referencia) return falha("REFERENCIA_INVALIDA", "Indique a referência da ordem.");
  if (mundo.ordens.some((ordem) => ordem.operadorId === entrada.operadorId && ordem.referencia === referencia)) {
    return falha("REFERENCIA_DUPLICADA", "Já existe uma ordem com esta referência neste operador.");
  }

  const tecnologia = entrada.tecnologia ?? null;
  const catalogo = validarCatalogo(entrada.operadorId, entrada.categoria, tecnologia, entrada.janelaInicio, entrada.janelaFim);
  if ("ok" in catalogo) return catalogo;
  const { duracaoMin } = catalogo;

  const capazes = mundo.equipas.filter((equipa) =>
    equipaCobre(equipa, entrada.operadorId, entrada.categoria, tecnologia, entrada.area),
  );
  if (entrada.equipaId) {
    const equipa = mundo.equipas.find((linha) => linha.id === entrada.equipaId);
    if (!equipa) return falha("EQUIPA_DESCONHECIDA", "A equipa não existe.");
    if (!equipa.areas.includes(entrada.area)) return falha("AREA", "A equipa não cobre esta área.");
    if (!equipaCobre(equipa, entrada.operadorId, entrada.categoria, tecnologia, entrada.area)) {
      return falha("COMPETENCIA", "A equipa não tem competência para este serviço.");
    }
  } else if (capazes.length === 0) {
    return falha("SEM_EQUIPA", "Nenhuma equipa cobre a área e a competência pedidas.");
  }

  const candidatas = entrada.equipaId ? mundo.equipas.filter((equipa) => equipa.id === entrada.equipaId) : capazes;
  const trabalho: Trabalho = {
    id,
    janelaInicio: parseHHMM(entrada.janelaInicio),
    janelaFim: parseHHMM(entrada.janelaFim),
    duracao: duracaoMin,
  };
  const viaveis = candidatas.filter((equipa) => diaAceita(mundo, equipa.id, entrada.data, [trabalho]));
  if (viaveis.length === 0) {
    const emTurno = candidatas.some((equipa) => restricoesDaEquipa(equipa, entrada.data, mundo.margemDeslocacaoMin));
    if (!emTurno) return falha("FORA_DE_TURNO", "A equipa não trabalha nesse dia.");
    return falha("INVIAVEL", "Nenhuma sequência de inícios respeita as janelas prometidas.");
  }

  viaveis.sort((a, b) => carga(mundo, a.id, entrada.data) - carga(mundo, b.id, entrada.data) || a.id.localeCompare(b.id));
  const equipa = viaveis[0];
  let seguinte = structuredClone(mundo);
  const ordem: Ordem = {
    id,
    operadorId: entrada.operadorId,
    referencia,
    area: entrada.area,
    zonaId: entrada.zonaId,
    equipaId: equipa.id,
    categoria: entrada.categoria,
    tecnologia,
    data: entrada.data,
    janelaInicio: entrada.janelaInicio,
    janelaFim: entrada.janelaFim,
    duracaoMin,
    prioridade: entrada.prioridade,
    estado: "agendada",
    inicioPlaneado: null,
    fimPlaneado: null,
    inicioFixado: false,
    clienteNome: entrada.clienteNome.trim(),
    clienteContacto: entrada.clienteContacto.trim(),
    morada: entrada.morada.trim(),
    nota: entrada.nota?.trim() ?? "",
    motivoCancelamento: null,
    quemPediu: null,
  };
  seguinte.ordens.push(ordem);
  seguinte = recalcularDia(seguinte, equipa.id, entrada.data);
  const guardada = seguinte.ordens.find((linha) => linha.id === id)!;
  return { ok: true, mundo: seguinte, resultado: guardada };
}

export function agendarExistente(mundo: Mundo, id: string, equipaId?: string | null): Resultado<Ordem> {
  const ordem = mundo.ordens.find((linha) => linha.id === id);
  if (!ordem) return falha("NAO_ENCONTRADO", "Não encontrámos a ordem.");
  if (ordem.estado !== "pendente" && ordem.estado !== "em_espera") {
    return falha("CONFLITO", "Esta ordem já não está por marcar.");
  }
  const semEsta: Mundo = { ...mundo, ordens: mundo.ordens.filter((linha) => linha.id !== id) };
  return marcarOrdem(
    semEsta,
    {
      operadorId: ordem.operadorId,
      referencia: ordem.referencia,
      area: ordem.area,
      zonaId: ordem.zonaId,
      categoria: ordem.categoria,
      tecnologia: ordem.tecnologia,
      data: ordem.data,
      janelaInicio: ordem.janelaInicio,
      janelaFim: ordem.janelaFim,
      prioridade: ordem.prioridade,
      clienteNome: ordem.clienteNome,
      clienteContacto: ordem.clienteContacto,
      morada: ordem.morada,
      nota: ordem.nota,
      equipaId: equipaId ?? null,
    },
    id,
  );
}

export function cancelarOrdem(
  mundo: Mundo,
  id: string,
  motivo: string,
  quemPediu: QuemPediu = "central",
): Resultado<Ordem> {
  const existente = mundo.ordens.find((ordem) => ordem.id === id);
  if (!existente) return falha("NAO_ENCONTRADO", "Não encontrámos a ordem.");
  if (existente.estado === "cancelada") return { ok: true, mundo, resultado: existente };
  if (!ocupaCapacidade(existente.estado) && existente.estado !== "pendente" && existente.estado !== "em_espera") {
    return falha("CONFLITO", "Esta ordem já não pode ser cancelada.");
  }
  let seguinte = structuredClone(mundo);
  const ordem = seguinte.ordens.find((linha) => linha.id === id)!;
  const equipaId = ordem.equipaId;
  const data = ordem.data;
  ordem.estado = "cancelada";
  ordem.inicioPlaneado = null;
  ordem.fimPlaneado = null;
  ordem.inicioFixado = false;
  ordem.motivoCancelamento = motivo.trim() || "Sem motivo indicado.";
  ordem.quemPediu = quemPediu;
  if (equipaId) seguinte = recalcularDia(seguinte, equipaId, data);
  return { ok: true, mundo: seguinte, resultado: seguinte.ordens.find((linha) => linha.id === id)! };
}

/** Reposição imediata após um cancelamento (Anular no toast). */
export function restaurarCancelamento(mundo: Mundo, id: string): Resultado<Ordem> {
  const existente = mundo.ordens.find((ordem) => ordem.id === id);
  if (!existente) return falha("NAO_ENCONTRADO", "Não encontrámos a ordem.");
  if (existente.estado !== "cancelada") {
    return falha("CONFLITO", "Só uma ordem cancelada pode ser reposta.");
  }
  let seguinte = structuredClone(mundo);
  const ordem = seguinte.ordens.find((linha) => linha.id === id)!;
  ordem.motivoCancelamento = null;
  ordem.quemPediu = null;
  ordem.inicioFixado = false;
  ordem.inicioPlaneado = null;
  ordem.fimPlaneado = null;
  if (ordem.equipaId) {
    ordem.estado = "agendada";
    seguinte = recalcularDia(seguinte, ordem.equipaId, ordem.data);
  } else {
    ordem.estado = "em_espera";
  }
  return { ok: true, mundo: seguinte, resultado: seguinte.ordens.find((linha) => linha.id === id)! };
}

export function reagendarOrdem(mundo: Mundo, id: string, alteracao: AlteracaoAgenda): Resultado<Ordem> {
  const existente = mundo.ordens.find((ordem) => ordem.id === id);
  if (!existente) return falha("NAO_ENCONTRADO", "Não encontrámos a ordem.");
  if (existente.estado !== "agendada") {
    return falha("CONFLITO", "Só uma ordem agendada pode ser reagendada.");
  }

  let seguinte = structuredClone(mundo);
  const ordem = seguinte.ordens.find((linha) => linha.id === id)!;
  const origemId = ordem.equipaId;
  const dataOrigem = ordem.data;
  if (alteracao.data) {
    if (!eDataIso(alteracao.data)) return falha("DATA_INVALIDA", "A data tem de estar no formato AAAA-MM-DD.");
    ordem.data = alteracao.data;
  }
  if (alteracao.janelaInicio) ordem.janelaInicio = alteracao.janelaInicio;
  if (alteracao.janelaFim) ordem.janelaFim = alteracao.janelaFim;
  const catalogo = validarCatalogo(ordem.operadorId, ordem.categoria, ordem.tecnologia, ordem.janelaInicio, ordem.janelaFim);
  if ("ok" in catalogo) return catalogo;

  if (alteracao.equipaId) ordem.equipaId = alteracao.equipaId;
  if (!ordem.equipaId) return falha("EQUIPA_DESCONHECIDA", "A ordem ficou sem equipa.");
  const destino = seguinte.equipas.find((linha) => linha.id === ordem.equipaId);
  if (!destino) return falha("EQUIPA_DESCONHECIDA", "A equipa não existe.");
  if (!equipaCobre(destino, ordem.operadorId, ordem.categoria, ordem.tecnologia, ordem.area)) {
    return falha("COMPETENCIA", "A equipa de destino não cobre esta ordem.");
  }

  if (alteracao.inicioPlaneado === null) {
    ordem.inicioFixado = false;
    ordem.inicioPlaneado = null;
    ordem.fimPlaneado = null;
  } else if (typeof alteracao.inicioPlaneado === "string") {
    const minuto = parseSeguro(alteracao.inicioPlaneado);
    if (minuto === null) return falha("HORA_INVALIDA", "O início tem de estar no formato HH:MM.");
    const inicioJanela = parseHHMM(ordem.janelaInicio);
    const fimJanela = parseHHMM(ordem.janelaFim);
    if (minuto < inicioJanela || minuto > fimJanela) {
      return falha("JANELA", "O início pedido está fora da janela prometida.");
    }
    ordem.inicioFixado = true;
    ordem.inicioPlaneado = formatHHMM(minuto);
    ordem.fimPlaneado = null;
  }

  if (!diaAceita(seguinte, destino.id, ordem.data)) {
    const emTurno = restricoesDaEquipa(destino, ordem.data, seguinte.margemDeslocacaoMin);
    if (!emTurno) return falha("FORA_DE_TURNO", "A equipa não trabalha nesse dia.");
    return falha("INVIAVEL", "Nenhuma sequência de inícios respeita as janelas prometidas.");
  }
  seguinte = recalcularDia(seguinte, destino.id, ordem.data);
  if (origemId && (origemId !== destino.id || dataOrigem !== ordem.data)) {
    seguinte = recalcularDia(seguinte, origemId, dataOrigem);
  }
  const partido = seguinte.ordens.some(
    (linha) =>
      ocupaCapacidade(linha.estado) &&
      (linha.equipaId === destino.id || linha.equipaId === origemId) &&
      (linha.data === ordem.data || linha.data === dataOrigem) &&
      linha.inicioPlaneado === null,
  );
  if (partido) return falha("INVIAVEL", "Nenhuma sequência de inícios respeita as janelas prometidas.");
  return { ok: true, mundo: seguinte, resultado: seguinte.ordens.find((linha) => linha.id === id)! };
}

function parseSeguro(valor: string): number | null {
  try {
    return parseHHMM(valor);
  } catch {
    return null;
  }
}

export interface Conflito {
  ordemId: string;
  tipo: "sobreposicao" | "janela" | "deslocacao" | "indisponibilidade" | "turno" | "sem_plano";
  mensagem: string;
}

export function detetarConflitos(mundo: Mundo, equipaId: string, data: string): Conflito[] {
  const equipa = mundo.equipas.find((linha) => linha.id === equipaId);
  const ordens = ordensDoDia(mundo, equipaId, data);
  if (!equipa) return [];
  const conflitos: Conflito[] = [];
  const restricoes = restricoesDaEquipa(equipa, data, mundo.margemDeslocacaoMin);
  const planeadas = ordens
    .filter((ordem) => ordem.inicioPlaneado && ordem.fimPlaneado)
    .map((ordem) => ({
      ordem,
      inicio: parseHHMM(ordem.inicioPlaneado!),
      fim: parseHHMM(ordem.fimPlaneado!),
    }))
    .sort((a, b) => a.inicio - b.inicio || a.ordem.referencia.localeCompare(b.ordem.referencia));

  for (const ordem of ordens) {
    if (!ordem.inicioPlaneado || !ordem.fimPlaneado) {
      conflitos.push({
        ordemId: ordem.id,
        tipo: "sem_plano",
        mensagem: "Esta visita ficou sem um início que respeite a janela, o turno e a margem de deslocação.",
      });
    }
  }

  for (const linha of planeadas) {
    const inicioJanela = parseHHMM(linha.ordem.janelaInicio);
    const fimJanela = parseHHMM(linha.ordem.janelaFim);
    if (linha.inicio < inicioJanela || linha.inicio > fimJanela) {
      conflitos.push({
        ordemId: linha.ordem.id,
        tipo: "janela",
        mensagem: "O início planeado está fora da janela prometida.",
      });
    }
    if (!restricoes || linha.inicio < restricoes.inicioTurno || linha.fim > restricoes.fimTurno) {
      conflitos.push({
        ordemId: linha.ordem.id,
        tipo: "turno",
        mensagem: "A ocupação sai do horário da equipa.",
      });
    }
    if (restricoes) {
      const choque = restricoes.blocos.find((bloco) => linha.inicio < bloco.fim && linha.fim > bloco.inicio);
      if (choque) {
        conflitos.push({
          ordemId: linha.ordem.id,
          tipo: "indisponibilidade",
          mensagem: "A visita cruza uma indisponibilidade da equipa.",
        });
      }
    }
  }

  for (let indice = 1; indice < planeadas.length; indice += 1) {
    const anterior = planeadas[indice - 1];
    const atual = planeadas[indice];
    if (atual.inicio < anterior.fim) {
      conflitos.push({
        ordemId: atual.ordem.id,
        tipo: "sobreposicao",
        mensagem: "Sobreposição com outra visita da mesma equipa.",
      });
      continue;
    }
    const margem = mundo.margemDeslocacaoMin;
    if (atual.inicio < anterior.fim + margem) {
      conflitos.push({
        ordemId: atual.ordem.id,
        tipo: "deslocacao",
        mensagem: `Faltam minutos de deslocação face à visita anterior (margem de ${margem} min).`,
      });
    }
  }

  return conflitos;
}

export interface ResumoUtilizacao {
  equipaId: string;
  nome: string;
  ocupadoMin: number;
  turnoMin: number;
  percentagem: number;
  porOperador: { operadorId: OperadorId; minutos: number }[];
}

export function utilizacaoDoDia(mundo: Mundo, data: string): ResumoUtilizacao[] {
  return mundo.equipas.map((equipa) => {
    const restricoes = restricoesDaEquipa(equipa, data, mundo.margemDeslocacaoMin);
    const turnoMin = restricoes ? minutosDeTurno(restricoes) : 0;
    const ordens = ordensDoDia(mundo, equipa.id, data).filter((ordem) => ordem.inicioPlaneado && ordem.fimPlaneado);
    const porOperadorMapa = new Map<OperadorId, number>();
    let ocupadoMin = 0;
    for (const ordem of ordens) {
      const minutos = parseHHMM(ordem.fimPlaneado!) - parseHHMM(ordem.inicioPlaneado!);
      ocupadoMin += Math.max(0, minutos);
      porOperadorMapa.set(ordem.operadorId, (porOperadorMapa.get(ordem.operadorId) ?? 0) + Math.max(0, minutos));
    }
    return {
      equipaId: equipa.id,
      nome: equipa.nome,
      ocupadoMin,
      turnoMin,
      percentagem: turnoMin === 0 ? 0 : Math.round((ocupadoMin / turnoMin) * 100),
      porOperador: [...porOperadorMapa.entries()].map(([operadorId, minutos]) => ({ operadorId, minutos })),
    };
  });
}
