import "server-only";

import { indicadoresDoDia } from "@/lib/gemeo/indicadores";
import { zonaDaArea } from "@/lib/ofsc/zonas";
import { AREAS } from "@/lib/rules/areas";
import { distritoDoMunicipio } from "@/lib/zonas/catalogo";
import { recalcularDia } from "@/lib/rules/dia";
import {
  agendarExistente,
  atribuirPeriodo,
  cancelarOrdem,
  diaAceita,
  restaurarCancelamento as restaurarCancelamentoNoMundo,
  eDataIso,
  hojeLisboa,
  marcarOrdem,
  NOME_OPERADOR,
  ordensDoDia,
  parseHHMM,
  estadoEditavel,
  podeGerirEquipas,
  podeLerOrdem,
  podeMarcarOperador,
  podeMudarEstado,
  podeReagendar,
  podeReencaiarGlobal,
  podeVerEquipa,
  projetarAgenda,
  projetarPlano,
  proporVagas,
  reagendarOrdem,
  reencaixar,
  ROTULO_ESTADO,
  somarDias,
  utilizacaoDoDia,
  validarCatalogo,
  validarOperadoresServidos,
  competenciasDeOperadores,
  vigenteEm,
  type Agenda,
  type Ator,
  type Categoria,
  type EstadoOrdem,
  type Mundo,
  type OperadorId,
  type Ordem,
  type PedidoRealocacao,
  type PlanoVista,
  type Prioridade,
  type PublicacaoVagas,
  type QuemPediu,
  type Tecnologia,
} from "@/lib/rules";
import {
  baseDados,
  definirMargem,
  diaDemonstracaoAtual,
  lerMundo,
  ordemDeLinha,
  registarAuditoria,
  registarHistorico,
  selarImpressao,
  sincronizarMundo,
  transacao,
  transacaoImediata,
} from "./db";
import { ErroHttp, exigir } from "./erros";

export interface OrdemVista {
  id: string;
  referencia: string;
  operadorId: OperadorId;
  operadorNome: string;
  estado: EstadoOrdem;
  estadoRotulo: string;
  prioridade: Prioridade;
  categoria: Categoria;
  tecnologia: Tecnologia | null;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  duracaoMin: number;
  inicioPlaneado: string | null;
  fimPlaneado: string | null;
  inicioFixado: boolean;
  equipaId: string | null;
  equipaNome: string | null;
  area: string;
  zonaId: string;
  zonaNome: string;
  clienteNome: string;
  clienteContacto: string;
  morada: string;
  nota: string;
  motivoCancelamento: string | null;
  quemPediu: QuemPediu | null;
}

export interface HistoricoVista {
  id: string;
  quando: string;
  acao: string;
  detalhe: string;
  autor: string | null;
}

export interface EquipaVista {
  id: string;
  codigo: string;
  nome: string;
  base: string;
  distrito: string | null;
  cco: string;
  ativa: boolean;
  areas: string[];
  zona: { id: string; codigo: string; nome: string } | null;
  membros: { id: string; nome: string; ativo: boolean }[];
  operadoresServidos: OperadorId[];
  competencias: { operadorId: OperadorId; categorias: Categoria[]; tecnologias: Tecnologia[] }[];
  horarios: { diaSemana: number; inicio: string; fim: string }[];
  indisponibilidades: { id: string; data: string; inicio: string; fim: string; motivo: string }[];
  ocupacaoHoje: { proprias: OrdemVista[]; minutosOutros: number; turnoMin: number; ocupadoMin: number };
}

function nomes(): { equipas: Map<string, string>; zonas: Map<string, string> } {
  const db = baseDados();
  const equipas = new Map<string, string>();
  const zonas = new Map<string, string>();
  for (const linha of db.prepare("SELECT id, nome FROM equipas").all() as { id: string; nome: string }[]) {
    equipas.set(linha.id, linha.nome);
  }
  for (const linha of db.prepare("SELECT id, nome FROM zonas").all() as { id: string; nome: string }[]) {
    zonas.set(linha.id, linha.nome);
  }
  return { equipas, zonas };
}

export function verOrdem(ordem: Ordem, mapas = nomes()): OrdemVista {
  return {
    id: ordem.id,
    referencia: ordem.referencia,
    operadorId: ordem.operadorId,
    operadorNome: NOME_OPERADOR[ordem.operadorId],
    estado: ordem.estado,
    estadoRotulo: ROTULO_ESTADO[ordem.estado],
    prioridade: ordem.prioridade,
    categoria: ordem.categoria,
    tecnologia: ordem.tecnologia,
    data: ordem.data,
    janelaInicio: ordem.janelaInicio,
    janelaFim: ordem.janelaFim,
    duracaoMin: ordem.duracaoMin,
    inicioPlaneado: ordem.inicioPlaneado,
    fimPlaneado: ordem.fimPlaneado,
    inicioFixado: ordem.inicioFixado,
    equipaId: ordem.equipaId,
    equipaNome: ordem.equipaId ? (mapas.equipas.get(ordem.equipaId) ?? null) : null,
    area: ordem.area,
    zonaId: ordem.zonaId,
    zonaNome: mapas.zonas.get(ordem.zonaId) ?? ordem.zonaId,
    clienteNome: ordem.clienteNome,
    clienteContacto: ordem.clienteContacto,
    morada: ordem.morada,
    nota: ordem.nota,
    motivoCancelamento: ordem.motivoCancelamento,
    quemPediu: ordem.quemPediu,
  };
}

function aplicarFiltro(ator: Ator, sql: string[], params: (string | number | null)[]): void {
  if (ator.papel === "despachante") {
    sql.push("AND o.operador_id = ?");
    params.push(ator.operadorId);
  } else if (ator.papel === "tecnico") {
    sql.push("AND o.equipa_id = ?");
    params.push(ator.equipaId);
  }
}

export function listarOrdens(
  ator: Ator,
  filtro: { estado?: string; operador?: string; data?: string; de?: string; ate?: string; q?: string; equipaId?: string },
): OrdemVista[] {
  const sql = ["SELECT o.* FROM ordens o WHERE 1 = 1"];
  const params: (string | number | null)[] = [];
  aplicarFiltro(ator, sql, params);
  if (filtro.estado) {
    sql.push("AND o.estado = ?");
    params.push(filtro.estado);
  }
  if (filtro.operador && (ator.papel === "administrador" || ator.papel === "supervisor")) {
    sql.push("AND o.operador_id = ?");
    params.push(filtro.operador);
  }
  if (filtro.data) {
    sql.push("AND o.data = ?");
    params.push(filtro.data);
  }
  if (filtro.de) {
    sql.push("AND o.data >= ?");
    params.push(filtro.de);
  }
  if (filtro.ate) {
    sql.push("AND o.data <= ?");
    params.push(filtro.ate);
  }
  if (filtro.equipaId && ator.papel !== "tecnico") {
    sql.push("AND o.equipa_id = ?");
    params.push(filtro.equipaId);
  }
  if (filtro.q) {
    sql.push("AND (o.referencia LIKE ? OR o.cliente_nome LIKE ? OR o.morada LIKE ? OR o.area LIKE ?)");
    const termo = `%${filtro.q.trim()}%`;
    params.push(termo, termo, termo, termo);
  }
  sql.push("ORDER BY o.data, o.janela_inicio, o.referencia");
  const linhas = baseDados()
    .prepare(sql.join(" "))
    .all(...params) as Record<string, string | number | null>[];
  const mapas = nomes();
  return linhas.map((linha) => verOrdem(ordemDeLinha(linha), mapas)).filter((ordem) => podeLerOrdem(ator, ordem));
}

export function obterOrdem(ator: Ator, id: string): { ordem: OrdemVista; historico: HistoricoVista[] } {
  const linha = baseDados().prepare("SELECT * FROM ordens WHERE id = ?").get(id) as
    | Record<string, string | number | null>
    | undefined;
  exigir(Boolean(linha), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  const ordem = ordemDeLinha(linha!);
  exigir(podeLerOrdem(ator, ordem), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  const historico = baseDados()
    .prepare(
      `SELECT h.id, h.quando, h.acao, h.detalhe, u.nome AS autor
       FROM historico_ordens h
       LEFT JOIN utilizadores u ON u.id = h.utilizador_id
       WHERE h.ordem_id = ?
       ORDER BY h.quando`,
    )
    .all(id) as unknown as HistoricoVista[];
  return { ordem: verOrdem(ordem), historico };
}

export interface NovaOrdem {
  operadorId: OperadorId;
  referencia: string;
  area: string;
  zonaId: string;
  categoria: Categoria;
  tecnologia: Tecnologia | null;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  prioridade: Prioridade;
  clienteNome: string;
  clienteContacto: string;
  morada: string;
  nota: string;
  equipaId: string | null;
  modo: "agendar" | "espera" | "pendente";
}

/** O motor responde 409 quando o pedido é bem formado mas conflitua com o que já existe (README: «Contrato HTTP»). */
function estadoDoMotor(codigo: string): number {
  return codigo === "INVIAVEL" || codigo === "REFERENCIA_DUPLICADA" || codigo === "OPERADOR_NAO_SERVIDO" || codigo === "SLOT_OCUPADO"
    ? 409
    : 400;
}

/**
 * Zona = município (DICOFRE). Cada área tem uma zona canónica; equipas com vigência noutro
 * município que ainda cobrem a área (via `areas`) aparecem como alternativas no formulário.
 */
export function zonasPorArea(): Record<string, string[]> {
  const linhas = baseDados()
    .prepare(
      `SELECT e.areas AS areas, z.id AS zona, z.codigo AS codigo
       FROM equipas e
       JOIN equipa_zona ez ON ez.equipa_id = e.id
       JOIN zonas z ON z.id = ez.zona_id
       WHERE e.ativa = 1 AND (ez.fim IS NULL OR ez.fim >= date('now'))`,
    )
    .all() as { areas: string; zona: string; codigo: string }[];
  const resultado: Record<string, string[]> = {};
  for (const area of AREAS) {
    const padrao = zonaDaArea(area);
    const outras = new Map<string, string>();
    for (const linha of linhas) {
      if (linha.zona !== padrao && (JSON.parse(linha.areas) as string[]).includes(area)) {
        outras.set(linha.zona, linha.codigo);
      }
    }
    resultado[area] = [padrao, ...[...outras.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id]) => id)];
  }
  return resultado;
}

export function zonasDaArea(area: string): string[] {
  return zonasPorArea()[area] ?? [];
}

/** B3: a zona de uma ordem tem de servir a sua área. A mensagem diz quais as zonas possíveis. */
function exigirZonaCoerente(area: string, zonaId: string): void {
  const validas = zonasDaArea(area);
  if (validas.includes(zonaId)) return;
  const nomes = new Map(listarZonas().map((zona) => [zona.id, `${zona.codigo} · ${zona.nome}`]));
  const rotulo = (id: string) => nomes.get(id) ?? id;
  throw new ErroHttp(
    400,
    "DADOS_INVALIDOS",
    `A zona ${rotulo(zonaId)} não corresponde à área ${area}. Zonas possíveis: ${validas.map(rotulo).join(", ")}.`,
  );
}

function validarDataOperador(ator: Ator, operadorId: string, data: string): void {
  if (ator.papel !== "despachante") return;
  const hoje = hojeLisboa();
  if (data < hoje) {
    throw new ErroHttp(400, "PASSADO", "Um despachante não marca visitas em dias já passados.");
  }
  const horizonte = baseDados().prepare("SELECT horizonte_dias AS dias FROM operadores WHERE id = ?").get(operadorId) as
    | { dias: number }
    | undefined;
  const limite = somarDias(hoje, Number(horizonte?.dias ?? 15));
  if (data > limite) {
    throw new ErroHttp(400, "HORIZONTE", `Este operador só marca até ${limite.split("-").reverse().join("/")}.`);
  }
}

export interface AlternativaReserva {
  inicio: string;
  fim: string;
  equipaId: string;
  equipa: string;
}

export interface OrdemFuturaDetalhe {
  id: string;
  referencia: string;
  operadorId: OperadorId;
  data: string;
}

function alternativaDeReserva(mundo: Mundo, entrada: NovaOrdem): AlternativaReserva | null {
  const publicacao = proporVagas(mundo, {
    operadorId: entrada.operadorId,
    data: entrada.data,
    area: entrada.area,
    categoria: entrada.categoria,
    tecnologia: entrada.tecnologia,
  });
  for (const janela of publicacao.janelas) {
    if (janela.inicio === entrada.janelaInicio && janela.fim === entrada.janelaFim) continue;
    if (janela.estado === "indisponivel") continue;
    const livre = janela.equipas.find((e) => e.estado !== "indisponivel");
    if (!livre) continue;
    return { inicio: janela.inicio, fim: janela.fim, equipaId: livre.equipaId, equipa: livre.nome };
  }
  const mesma = publicacao.janelas.find((j) => j.inicio === entrada.janelaInicio && j.fim === entrada.janelaFim);
  const outraEquipa = mesma?.equipas.find((e) => e.estado !== "indisponivel" && e.equipaId !== entrada.equipaId);
  if (outraEquipa) {
    return {
      inicio: entrada.janelaInicio,
      fim: entrada.janelaFim,
      equipaId: outraEquipa.equipaId,
      equipa: outraEquipa.nome,
    };
  }
  return null;
}

function intervaloBloqueadoPorOutroOperador(mundo: Mundo, entrada: NovaOrdem): boolean {
  const capazes = mundo.equipas.filter((equipa) =>
    entrada.equipaId ? equipa.id === entrada.equipaId : true,
  );
  const candidatas = entrada.equipaId
    ? capazes
    : mundo.equipas.filter((equipa) =>
        equipa.areas.includes(entrada.area) &&
        (equipa.operadoresServidos?.includes(entrada.operadorId) ??
          equipa.competencias.some((c) => c.operadorId === entrada.operadorId)),
      );
  const pedidoIni = parseHHMM(entrada.janelaInicio);
  const pedidoFim = parseHHMM(entrada.janelaFim);
  for (const equipa of candidatas) {
    for (const ordem of ordensDoDia(mundo, equipa.id, entrada.data)) {
      if (ordem.operadorId === entrada.operadorId) continue;
      const ini = parseHHMM(ordem.inicioPlaneado ?? ordem.janelaInicio);
      const fim = parseHHMM(ordem.fimPlaneado ?? ordem.janelaFim);
      if (ini < pedidoFim && fim > pedidoIni) return true;
    }
  }
  return false;
}

export function criarOrdem(ator: Ator, entrada: NovaOrdem): OrdemVista {
  exigir(podeMarcarOperador(ator, entrada.operadorId), 403, "SEM_PERMISSAO", "Não pode marcar ordens deste operador.");
  exigir((AREAS as readonly string[]).includes(entrada.area), 400, "DADOS_INVALIDOS", "A área não está na lista de localidades.");
  exigirZonaCoerente(entrada.area, entrada.zonaId);
  validarDataOperador(ator, entrada.operadorId, entrada.data);
  const catalogo = validarCatalogo(entrada.operadorId, entrada.categoria, entrada.tecnologia, entrada.janelaInicio, entrada.janelaFim);
  if ("ok" in catalogo) throw new ErroHttp(400, catalogo.codigo, catalogo.mensagem);

  if (entrada.modo === "agendar") {
    let vista: OrdemVista | null = null;
    transacaoImediata(() => {
      const antes = lerMundo();
      const resultado = marcarOrdem(antes, { ...entrada, tecnologia: entrada.tecnologia });
      if (!resultado.ok) {
        if (resultado.codigo === "INVIAVEL") {
          const porOutro = intervaloBloqueadoPorOutroOperador(antes, entrada);
          const mensagem = porOutro
            ? "O intervalo já foi reservado por outro operador."
            : "O intervalo deixou de estar livre nesta equipa.";
          const alternativa = alternativaDeReserva(antes, entrada);
          throw new ErroHttp(409, "SLOT_OCUPADO", mensagem, {
            causa: porOutro ? "outro_operador" : "intervalo",
            alternativa,
          });
        }
        throw new ErroHttp(estadoDoMotor(resultado.codigo), resultado.codigo, resultado.mensagem);
      }
      aplicarDiferença(ator, antes, resultado.mundo, "A ordem foi marcada.");
      vista = verOrdem(resultado.resultado);
    });
    return vista!;
  }

  const antes = lerMundo();
  const id = `ord-${crypto.randomUUID()}`;
  const ordem: Ordem = {
    id,
    operadorId: entrada.operadorId,
    referencia: entrada.referencia.trim(),
    area: entrada.area,
    zonaId: entrada.zonaId,
    equipaId: null,
    categoria: entrada.categoria,
    tecnologia: entrada.tecnologia,
    data: entrada.data,
    janelaInicio: entrada.janelaInicio,
    janelaFim: entrada.janelaFim,
    duracaoMin: catalogo.duracaoMin,
    prioridade: entrada.prioridade,
    estado: entrada.modo === "espera" ? "em_espera" : "pendente",
    inicioPlaneado: null,
    fimPlaneado: null,
    inicioFixado: false,
    clienteNome: entrada.clienteNome.trim(),
    clienteContacto: entrada.clienteContacto.trim(),
    morada: entrada.morada.trim(),
    nota: entrada.nota.trim(),
    motivoCancelamento: null,
    quemPediu: null,
  };
  if (antes.ordens.some((linha) => linha.operadorId === ordem.operadorId && linha.referencia === ordem.referencia)) {
    throw new ErroHttp(409, "REFERENCIA_DUPLICADA", "Já existe uma ordem com esta referência neste operador.");
  }
  const depois: Mundo = { ...antes, ordens: [...antes.ordens, ordem] };
  gravarDiferença(ator, antes, depois, ordem.estado === "em_espera" ? "A ordem entrou na fila de espera." : "A ordem ficou pendente.");
  return verOrdem(ordem);
}

function aplicarDiferença(ator: Ator, antes: Mundo, depois: Mundo, detalheAuditoria: string): void {
  const ids = sincronizarMundo(antes, depois, ator.id);
  for (const id of ids) {
    const anterior = antes.ordens.find((ordem) => ordem.id === id);
    const seguinte = depois.ordens.find((ordem) => ordem.id === id);
    if (!seguinte) continue;
    const texto = descrever(anterior, seguinte);
    registarHistorico(id, ator.id, texto.acao, texto.detalhe);
  }
  registarAuditoria(ator.id, "mundo", detalheAuditoria);
}

function gravarDiferença(ator: Ator, antes: Mundo, depois: Mundo, detalheAuditoria: string): void {
  transacao(() => aplicarDiferença(ator, antes, depois, detalheAuditoria));
}

function descrever(antes: Ordem | undefined, depois: Ordem): { acao: string; detalhe: string } {
  if (!antes) return { acao: "criada", detalhe: `${depois.referencia} criada (${ROTULO_ESTADO[depois.estado]}).` };
  if (antes.estado !== depois.estado) {
    const motivoLimpo = depois.motivoCancelamento?.replace(/[.!?]\s*$/, "") ?? "";
    const motivo = motivoLimpo ? ` Motivo: ${motivoLimpo}.` : "";
    return {
      acao: depois.estado,
      detalhe: `Estado: ${ROTULO_ESTADO[antes.estado]} → ${ROTULO_ESTADO[depois.estado]}.${motivo}`,
    };
  }
  if (antes.equipaId !== depois.equipaId || antes.inicioPlaneado !== depois.inicioPlaneado || antes.data !== depois.data) {
    return {
      acao: "reagendada",
      detalhe: `Plano: ${depois.inicioPlaneado ?? "por definir"}–${depois.fimPlaneado ?? "…"} em ${depois.data}.`,
    };
  }
  return { acao: "alterada", detalhe: "Dados da ordem atualizados." };
}

export function atualizarOrdem(
  ator: Ator,
  id: string,
  campos: { clienteNome?: string; clienteContacto?: string; morada?: string; nota?: string; prioridade?: Prioridade },
): OrdemVista {
  const antes = lerMundo();
  const ordem = antes.ordens.find((linha) => linha.id === id);
  exigir(Boolean(ordem) && podeLerOrdem(ator, ordem!), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  exigir(ator.papel !== "tecnico", 403, "SEM_PERMISSAO", "O técnico não altera a ficha do cliente.");
  exigir(
    ordem!.estado !== "concluida" && ordem!.estado !== "cancelada",
    409,
    "CONFLITO",
    "Uma ordem concluída ou cancelada não pode ser alterada.",
  );
  const depois = structuredClone(antes);
  const alvo = depois.ordens.find((linha) => linha.id === id)!;
  if (campos.clienteNome) alvo.clienteNome = campos.clienteNome.trim();
  if (campos.clienteContacto) alvo.clienteContacto = campos.clienteContacto.trim();
  if (campos.morada) alvo.morada = campos.morada.trim();
  if (campos.nota !== undefined) alvo.nota = campos.nota.trim();
  if (campos.prioridade) alvo.prioridade = campos.prioridade;
  gravarDiferença(ator, antes, depois, `Ficha de ${alvo.referencia} atualizada.`);
  return verOrdem(alvo);
}

export function restaurarCancelamento(ator: Ator, id: string): OrdemVista {
  exigir(ator.papel !== "tecnico", 403, "SEM_PERMISSAO", "O técnico não cancela nem repõe ordens.");
  const antes = lerMundo();
  const ordem = antes.ordens.find((linha) => linha.id === id);
  exigir(Boolean(ordem), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  exigir(podeLerOrdem(ator, ordem!), 403, "SEM_PERMISSAO", "Sem acesso a esta ordem.");
  const resultado = restaurarCancelamentoNoMundo(antes, id);
  if (!resultado.ok) {
    const status = resultado.codigo === "CONFLITO" ? 409 : 400;
    throw new ErroHttp(status, resultado.codigo, resultado.mensagem);
  }
  gravarDiferença(ator, antes, resultado.mundo, `${ordem!.referencia} reposta por ${ator.nome}.`);
  return verOrdem(resultado.resultado);
}

export function mudarEstado(ator: Ator, id: string, estado: EstadoOrdem, motivo?: string, quemPediu?: QuemPediu): OrdemVista {
  const antes = lerMundo();
  const ordem = antes.ordens.find((linha) => linha.id === id);
  exigir(Boolean(ordem), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  if (estado === "cancelada") {
    exigir(ator.papel !== "tecnico", 403, "SEM_PERMISSAO", "O técnico não cancela ordens.");
    exigir(podeLerOrdem(ator, ordem!), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
    exigir(Boolean(motivo?.trim()), 400, "DADOS_INVALIDOS", "Cancelar exige um motivo.");
    exigir(Boolean(quemPediu), 400, "DADOS_INVALIDOS", "Indique quem pediu o cancelamento.");
    const resultado = cancelarOrdem(antes, id, motivo!.trim(), quemPediu!);
    if (!resultado.ok) {
      const status = resultado.codigo === "JA_CANCELADA" || resultado.codigo === "CONFLITO" ? 409 : 400;
      throw new ErroHttp(status, resultado.codigo, resultado.mensagem);
    }
    gravarDiferença(ator, antes, resultado.mundo, `${ordem!.referencia} cancelada.`);
    return verOrdem(resultado.resultado);
  }
  if (ordem!.estado === "concluida" || ordem!.estado === "cancelada") {
    throw new ErroHttp(409, "CONFLITO", "Uma ordem concluída ou cancelada não pode ser alterada.");
  }
  exigir(podeMudarEstado(ator, ordem!, estado), 403, "SEM_PERMISSAO", "Não pode mudar esta ordem para esse estado.");
  if (estado === "agendada") {
    const resultado = agendarExistente(antes, id, ordem!.equipaId);
    if (!resultado.ok) throw new ErroHttp(409, resultado.codigo, resultado.mensagem);
    gravarDiferença(ator, antes, resultado.mundo, `${ordem!.referencia} agendada.`);
    return verOrdem(resultado.resultado);
  }
  const depois = structuredClone(antes);
  const alvo = depois.ordens.find((linha) => linha.id === id)!;
  const equipaId = alvo.equipaId;
  const data = alvo.data;
  alvo.estado = estado;
  if (estado === "em_curso" || estado === "concluida") alvo.inicioFixado = true;
  if (estado === "em_espera" || estado === "pendente") {
    alvo.equipaId = null;
    alvo.inicioPlaneado = null;
    alvo.fimPlaneado = null;
    alvo.inicioFixado = false;
  }
  const mundo = equipaId ? recalcularDia(depois, equipaId, data) : depois;
  gravarDiferença(ator, antes, mundo, `${ordem!.referencia}: ${ROTULO_ESTADO[estado]}.`);
  return verOrdem(mundo.ordens.find((linha) => linha.id === id)!);
}

export function reagendar(ator: Ator, id: string, alteracao: Parameters<typeof reagendarOrdem>[2]): OrdemVista {
  const antes = lerMundo();
  const ordem = antes.ordens.find((linha) => linha.id === id);
  exigir(Boolean(ordem) && podeLerOrdem(ator, ordem!), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  if (!estadoEditavel(ordem!.estado)) {
    throw new ErroHttp(409, "CONFLITO", "Uma ordem concluída ou cancelada não pode ser alterada.");
  }
  exigir(podeReagendar(ator, ordem!), 403, "SEM_PERMISSAO", "Não pode reagendar esta ordem.");
  if (alteracao.data) validarDataOperador(ator, ordem!.operadorId, alteracao.data);
  const resultado = reagendarOrdem(antes, id, alteracao);
  if (!resultado.ok) throw new ErroHttp(estadoDoMotor(resultado.codigo), resultado.codigo, resultado.mensagem);
  gravarDiferença(ator, antes, resultado.mundo, `${ordem!.referencia} reagendada.`);
  return verOrdem(resultado.resultado);
}

export function preverReagendamento(
  ator: Ator,
  id: string,
  alteracao: Parameters<typeof reagendarOrdem>[2],
): { mensagem: string; ordem: OrdemVista; depois: Agenda } {
  const antes = lerMundo();
  const ordem = antes.ordens.find((linha) => linha.id === id);
  exigir(Boolean(ordem) && podeLerOrdem(ator, ordem!), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  if (!estadoEditavel(ordem!.estado)) {
    throw new ErroHttp(409, "CONFLITO", "Uma ordem concluída ou cancelada não pode ser alterada.");
  }
  exigir(podeReagendar(ator, ordem!), 403, "SEM_PERMISSAO", "Não pode reagendar esta ordem.");
  if (alteracao.data) validarDataOperador(ator, ordem!.operadorId, alteracao.data);
  const resultado = reagendarOrdem(antes, id, alteracao);
  if (!resultado.ok) throw new ErroHttp(estadoDoMotor(resultado.codigo), resultado.codigo, resultado.mensagem);
  const nova = resultado.resultado;
  const datas = [ordem!.data, nova.data].sort();
  const depois = projetarAgenda(resultado.mundo, ator, datas[0]!, datas[datas.length - 1]!);
  const equipa = nova.equipaId ? resultado.mundo.equipas.find((linha) => linha.id === nova.equipaId) : undefined;
  const lugar = nova.inicioPlaneado && nova.fimPlaneado ? `${nova.inicioPlaneado}–${nova.fimPlaneado}` : "sem hora fechada";
  const onde = equipa ? ` na ${equipa.nome}` : "";
  return {
    mensagem: `${nova.referencia} passaria a ${lugar}${onde}. O dia é recalculado com a janela prometida, a margem de deslocação, as indisponibilidades e as competências. Nada fica gravado até confirmar.`,
    ordem: verOrdem(nova),
    depois,
  };
}

export function marcarJa(ator: Ator, id: string, equipaId?: string | null): OrdemVista {
  const antes = lerMundo();
  const ordem = antes.ordens.find((linha) => linha.id === id);
  exigir(Boolean(ordem) && podeLerOrdem(ator, ordem!), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  exigir(podeMarcarOperador(ator, ordem!.operadorId), 403, "SEM_PERMISSAO", "Não pode marcar ordens deste operador.");
  validarDataOperador(ator, ordem!.operadorId, ordem!.data);
  const resultado = agendarExistente(antes, id, equipaId);
  if (!resultado.ok) throw new ErroHttp(409, resultado.codigo, resultado.mensagem);
  gravarDiferença(ator, antes, resultado.mundo, `${ordem!.referencia} encaixada.`);
  return verOrdem(resultado.resultado);
}

export function previsualizar(ator: Ator, pedido: PedidoRealocacao): PlanoVista {
  const limitado = limitarPedido(ator, pedido);
  const antes = lerMundo();
  const plano = reencaixar(antes, limitado);
  return projetarPlano(antes, plano.mundo, plano, ator, selarImpressao(plano.impressao));
}

export function confirmarPlano(ator: Ator, pedido: PedidoRealocacao, selo: string): PlanoVista {
  const limitado = limitarPedido(ator, pedido);
  const antes = lerMundo();
  const plano = reencaixar(antes, limitado);
  if (!plano.viavel) throw new ErroHttp(409, "INVIAVEL", plano.mensagem);
  if (selarImpressao(plano.impressao) !== selo) {
    throw new ErroHttp(409, "DESATUALIZADO", "O plano ficou desatualizado. Peça uma nova pré-visualização.");
  }
  gravarDiferença(ator, antes, plano.mundo, plano.mensagem);
  const vista = projetarPlano(antes, plano.mundo, plano, ator, selo);
  return vista;
}

function limitarPedido(ator: Ator, pedido: PedidoRealocacao): PedidoRealocacao {
  if (ator.papel === "tecnico") {
    throw new ErroHttp(403, "SEM_PERMISSAO", "O técnico não reorganiza o dia.");
  }
  if (podeReencaiarGlobal(ator)) return pedido;
  if (pedido.equipaEmFalta) {
    throw new ErroHttp(403, "SEM_PERMISSAO", "Só a central regista a falta de uma equipa.");
  }
  const antes = lerMundo();
  if (pedido.cancelarId) {
    const ordem = antes.ordens.find((linha) => linha.id === pedido.cancelarId);
    exigir(Boolean(ordem) && podeLerOrdem(ator, ordem!), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  }
  if (pedido.encaixarId) {
    const ordem = antes.ordens.find((linha) => linha.id === pedido.encaixarId);
    exigir(Boolean(ordem) && podeLerOrdem(ator, ordem!), 404, "NAO_ENCONTRADO", "Não encontrámos esta ordem.");
  }
  return { ...pedido, apenasDoOperador: ator.operadorId ?? undefined, permitirTroca: false };
}

export function obterAgenda(ator: Ator, de: string, ate: string): Agenda {
  exigir(eDataIso(de) && eDataIso(ate), 400, "DATA_INVALIDA", "Indique um intervalo de datas válido.");
  exigir(ate >= de, 400, "INTERVALO", "O fim do período não pode ser anterior ao início.");
  if (somarDias(de, 14) < ate) {
    throw new ErroHttp(400, "INTERVALO", "O intervalo da agenda não pode passar de 15 dias.");
  }
  return projetarAgenda(lerMundo(), ator, de, ate);
}

export function obterVagas(
  ator: Ator,
  consulta: { operadorId: OperadorId; data: string; area: string; categoria: Categoria; tecnologia: Tecnologia | null },
): PublicacaoVagas {
  exigir(podeMarcarOperador(ator, consulta.operadorId) || ator.papel === "tecnico", 403, "SEM_PERMISSAO", "Sem acesso a estas vagas.");
  if (ator.papel === "despachante") {
    exigir(ator.operadorId === consulta.operadorId, 403, "SEM_PERMISSAO", "Só vê a capacidade do seu operador.");
  }
  return proporVagas(lerMundo(), consulta);
}

export function painel(ator: Ator, data: string) {
  const mundo = lerMundo();
  const utilizacao = utilizacaoDoDia(mundo, data).filter((linha) => podeVerEquipa(ator, linha.equipaId));
  const ordens = mundo.ordens.filter((ordem) => ordem.data === data && podeLerOrdem(ator, ordem));
  const contar = (estado: EstadoOrdem) => ordens.filter((ordem) => ordem.estado === estado).length;
  const central = ator.papel === "administrador" || ator.papel === "supervisor";
  const despachoId = ator.papel === "despachante" ? ator.operadorId : null;
  return {
    data,
    contagens: {
      agendada: contar("agendada"),
      emCurso: contar("em_curso"),
      concluida: contar("concluida"),
      emEspera: mundo.ordens.filter((ordem) => ordem.estado === "em_espera" && podeLerOrdem(ator, ordem)).length,
      pendente: mundo.ordens.filter((ordem) => ordem.estado === "pendente" && podeLerOrdem(ator, ordem)).length,
    },
    margemDeslocacaoMin: mundo.margemDeslocacaoMin,
    equipas: utilizacao.map((linha) => {
      if (despachoId) {
        const proprios = linha.porOperador.find((p) => p.operadorId === despachoId)?.minutos ?? 0;
        const minutosOutros = linha.porOperador
          .filter((p) => p.operadorId !== despachoId)
          .reduce((soma, p) => soma + p.minutos, 0);
        return {
          equipaId: linha.equipaId,
          nome: linha.nome,
          ocupadoMin: linha.ocupadoMin,
          turnoMin: linha.turnoMin,
          percentagem: linha.percentagem,
          porOperador: proprios > 0 ? [{ operadorId: despachoId, minutos: proprios }] : [],
          minutosOutros,
        };
      }
      return {
        equipaId: linha.equipaId,
        nome: linha.nome,
        ocupadoMin: linha.ocupadoMin,
        turnoMin: linha.turnoMin,
        percentagem: linha.percentagem,
        porOperador: central ? linha.porOperador : undefined,
        minutosOutros: 0,
      };
    }),
    visitas: ordens
      .filter((ordem) => ordem.estado === "agendada" || ordem.estado === "em_curso" || ordem.estado === "concluida")
      .map((ordem) => verOrdem(ordem))
      .sort((a, b) => (a.inicioPlaneado ?? a.janelaInicio).localeCompare(b.inicioPlaneado ?? b.janelaInicio)),
    indicadores: indicadoresDoDia(mundo, data, ator),
  };
}

export function listarZonas(): { id: string; codigo: string; nome: string; regiao: string }[] {
  const linhas = baseDados()
    .prepare(
      `SELECT z.id, z.codigo, z.nome, r.nome AS regiao
       FROM zonas z JOIN regioes r ON r.id = z.regiao_id
       ORDER BY z.codigo`,
    )
    .all() as { id: string; codigo: string; nome: string; regiao: string }[];
  return linhas.map((linha) => ({
    id: String(linha.id),
    codigo: String(linha.codigo),
    nome: String(linha.nome),
    regiao: String(linha.regiao),
  }));
}

export function listarEquipas(
  ator: Ator,
  dataRef?: string,
): (Omit<EquipaVista, "membros" | "ocupacaoHoje" | "indisponibilidades"> & { tecnicos: number })[] {
  const referencia = dataRef && eDataIso(dataRef) ? dataRef : diaDemonstracaoAtual();
  const db = baseDados();
  const linhas = db
    .prepare(
      `SELECT e.*, c.nome AS cco,
        (SELECT COUNT(*) FROM tecnicos t WHERE t.equipa_id = e.id AND t.ativo = 1) AS tecnicos
       FROM equipas e JOIN ccos c ON c.id = e.cco_id ORDER BY e.nome`,
    )
    .all() as Record<string, string | number>[];
  return linhas
    .filter((linha) => podeVerEquipa(ator, String(linha.id)))
    .map((linha) => {
      const periodos = db
        .prepare("SELECT id, zona_id AS chave, inicio, fim FROM equipa_zona WHERE equipa_id = ?")
        .all(String(linha.id)) as { id: string; chave: string; inicio: string; fim: string | null }[];
      const vigente = vigenteEm(periodos, referencia);
      const zonaLinha = vigente
        ? (db.prepare("SELECT id, codigo, nome FROM zonas WHERE id = ?").get(vigente.chave) as
            | { id: string; codigo: string; nome: string }
            | undefined)
        : undefined;
      const zona = zonaLinha
        ? { id: String(zonaLinha.id), codigo: String(zonaLinha.codigo), nome: String(zonaLinha.nome) }
        : null;
      const base = String(linha.base);
      return {
        id: String(linha.id),
        codigo: String(linha.codigo),
        nome: String(linha.nome),
        base,
        distrito: distritoDoMunicipio(base) ?? null,
        cco: String(linha.cco),
        ativa: Number(linha.ativa) === 1,
        areas: JSON.parse(String(linha.areas)) as string[],
        zona,
        tecnicos: Number(linha.tecnicos ?? 0),
        competencias: competenciasDe(String(linha.id)),
        operadoresServidos: operadoresServidosDe(String(linha.id)),
        horarios: horariosDe(String(linha.id)),
      };
    });
}

function competenciasDe(equipaId: string) {
  return (
    baseDados().prepare("SELECT operador_id, categorias, tecnologias FROM competencias WHERE equipa_id = ?").all(equipaId) as {
      operador_id: OperadorId;
      categorias: string;
      tecnologias: string;
    }[]
  ).map((linha) => ({
    operadorId: linha.operador_id,
    categorias: JSON.parse(linha.categorias) as Categoria[],
    tecnologias: JSON.parse(linha.tecnologias) as Tecnologia[],
  }));
}

function operadoresServidosDe(equipaId: string): OperadorId[] {
  return competenciasDe(equipaId).map((linha) => linha.operadorId);
}

function horariosDe(equipaId: string) {
  return (
    baseDados()
      .prepare("SELECT dia_semana, inicio, fim FROM horarios WHERE equipa_id = ? ORDER BY dia_semana")
      .all(equipaId) as { dia_semana: number; inicio: string; fim: string }[]
  ).map((linha) => ({ diaSemana: Number(linha.dia_semana), inicio: linha.inicio, fim: linha.fim }));
}

export function obterEquipa(ator: Ator, id: string, data = hojeLisboa()): EquipaVista {
  exigir(podeVerEquipa(ator, id), 404, "NAO_ENCONTRADO", "Não encontrámos esta equipa.");
  const resumo = listarEquipas(ator, data).find((equipa) => equipa.id === id);
  exigir(Boolean(resumo), 404, "NAO_ENCONTRADO", "Não encontrámos esta equipa.");
  const membros = baseDados()
    .prepare("SELECT id, nome, ativo FROM tecnicos WHERE equipa_id = ? ORDER BY nome")
    .all(id) as { id: string; nome: string; ativo: number }[];
  const indisponibilidades = (
    baseDados()
      .prepare("SELECT id, data, inicio, fim, motivo FROM indisponibilidades WHERE equipa_id = ? ORDER BY data, inicio")
      .all(id) as { id: string; data: string; inicio: string; fim: string; motivo: string }[]
  ).map((bloco) => ({
    id: String(bloco.id),
    data: String(bloco.data),
    inicio: String(bloco.inicio),
    fim: String(bloco.fim),
    motivo: String(bloco.motivo),
  }));
  const mundo = lerMundo();
  const doDia = ordensDoDia(mundo, id, data);
  const proprias = doDia.filter((ordem) => podeLerOrdem(ator, ordem)).map((ordem) => verOrdem(ordem));
  const minutosOutros = doDia
    .filter((ordem) => !podeLerOrdem(ator, ordem) && ordem.inicioPlaneado && ordem.fimPlaneado)
    .reduce((soma, ordem) => soma + (parseHHMM(ordem.fimPlaneado!) - parseHHMM(ordem.inicioPlaneado!)), 0);
  const uso = utilizacaoDoDia(mundo, data).find((linha) => linha.equipaId === id);
  const { tecnicos: _tecnicos, ...resto } = resumo!;
  return {
    ...resto,
    membros: membros.map((membro) => ({ id: membro.id, nome: membro.nome, ativo: Number(membro.ativo) === 1 })),
    indisponibilidades,
    ocupacaoHoje: {
      proprias,
      minutosOutros,
      turnoMin: uso?.turnoMin ?? 0,
      ocupadoMin: uso?.ocupadoMin ?? 0,
    },
  };
}

export function guardarEquipa(
  ator: Ator,
  id: string,
  campos: {
    ativa?: boolean;
    areas?: string[];
    horarios?: { diaSemana: number; inicio: string; fim: string }[];
    operadoresServidos?: OperadorId[];
    competencias?: { operadorId: OperadorId; categorias: Categoria[]; tecnologias: Tecnologia[] }[];
  },
): void {
  exigir(podeGerirEquipas(ator), 403, "SEM_PERMISSAO", "Só a central gere equipas.");
  const existe = baseDados().prepare("SELECT id FROM equipas WHERE id = ?").get(id);
  exigir(Boolean(existe), 404, "NAO_ENCONTRADO", "Não encontrámos esta equipa.");

  let competenciasEscrita = campos.competencias;
  let seguintesOps: OperadorId[] | null = null;

  if (campos.operadoresServidos) {
    const validados = validarOperadoresServidos(campos.operadoresServidos);
    if ("ok" in validados) throw new ErroHttp(400, validados.codigo, validados.mensagem);
    seguintesOps = validados;
  }

  const escrever = () => {
    const db = baseDados();
    if (seguintesOps) {
      const atuais = operadoresServidosDe(id);
      const removidos = atuais.filter((op) => !seguintesOps!.includes(op));
      if (removidos.length > 0) {
        const hoje = hojeLisboa();
        const futuras = db
          .prepare(
            `SELECT id, referencia, operador_id AS operadorId, data FROM ordens
             WHERE equipa_id = ? AND operador_id IN (${removidos.map(() => "?").join(",")})
               AND estado IN ('agendada','em_curso','em_espera','pendente')
               AND data >= ?
             ORDER BY data, referencia`,
          )
          .all(id, ...removidos, hoje) as unknown as OrdemFuturaDetalhe[];
        if (futuras.length > 0) {
          throw new ErroHttp(
            409,
            "OPERADOR_COM_ORDENS",
            "Não pode deixar de servir operador(es) com ordens futuras nesta equipa.",
            {
              remocoes: removidos,
              ordens: futuras.map((o) => ({
                id: String(o.id),
                referencia: String(o.referencia),
                operadorId: o.operadorId as OperadorId,
                data: String(o.data),
              })),
            },
          );
        }
      }
      const atuaisComp = competenciasDe(id);
      const mantidas = atuaisComp.filter((c) => seguintesOps!.includes(c.operadorId));
      const entrantes = seguintesOps.filter((op) => !atuais.includes(op));
      competenciasEscrita = [...mantidas, ...competenciasDeOperadores(entrantes)];
    }

    if (campos.ativa !== undefined) db.prepare("UPDATE equipas SET ativa = ? WHERE id = ?").run(campos.ativa ? 1 : 0, id);
    if (campos.areas) {
      exigir(campos.areas.length > 0, 400, "DADOS_INVALIDOS", "A equipa precisa de pelo menos uma área.");
      db.prepare("UPDATE equipas SET areas = ? WHERE id = ?").run(JSON.stringify(campos.areas), id);
    }
    if (campos.horarios) {
      db.prepare("DELETE FROM horarios WHERE equipa_id = ?").run(id);
      for (const horario of campos.horarios) {
        db.prepare("INSERT INTO horarios (id, equipa_id, dia_semana, inicio, fim) VALUES (?, ?, ?, ?, ?)").run(
          `hor-${id}-${horario.diaSemana}-${crypto.randomUUID().slice(0, 8)}`,
          id,
          horario.diaSemana,
          horario.inicio,
          horario.fim,
        );
      }
    }
    if (competenciasEscrita) {
      if (competenciasEscrita.length === 0) {
        throw new ErroHttp(400, "OPERADORES_SERVIDOS", "A equipa tem de servir pelo menos um operador.");
      }
      db.prepare("DELETE FROM competencias WHERE equipa_id = ?").run(id);
      for (const competencia of competenciasEscrita) {
        if (competencia.categorias.length === 0) continue;
        db.prepare("INSERT INTO competencias (equipa_id, operador_id, categorias, tecnologias) VALUES (?, ?, ?, ?)").run(
          id,
          competencia.operadorId,
          JSON.stringify(competencia.categorias),
          JSON.stringify(competencia.tecnologias),
        );
      }
    }
    registarAuditoria(ator.id, "equipa", `Equipa ${id} atualizada.`);
  };

  if (seguintesOps) transacaoImediata(escrever);
  else transacao(escrever);
}

export function mudarZona(
  ator: Ator,
  equipaId: string,
  entrada: { zonaId: string; inicio: string; fim: string | null; confirmacao?: boolean },
): void {
  exigir(podeGerirEquipas(ator), 403, "SEM_PERMISSAO", "Só a central muda a zona de uma equipa.");
  const periodos = baseDados()
    .prepare("SELECT id, zona_id AS chave, inicio, fim FROM equipa_zona WHERE equipa_id = ?")
    .all(equipaId) as { id: string; chave: string; inicio: string; fim: string | null }[];
  const resultado = atribuirPeriodo(periodos, { chave: entrada.zonaId, inicio: entrada.inicio, fim: entrada.fim }, {
    hoje: hojeLisboa(),
    confirmacao: entrada.confirmacao,
  });
  if (!resultado.ok) throw new ErroHttp(409, resultado.codigo, resultado.mensagem);
  transacao(() => {
    const db = baseDados();
    db.prepare("DELETE FROM equipa_zona WHERE equipa_id = ?").run(equipaId);
    for (const periodo of resultado.periodos) {
      db.prepare("INSERT INTO equipa_zona (id, equipa_id, zona_id, inicio, fim) VALUES (?, ?, ?, ?, ?)").run(
        periodo.id,
        equipaId,
        periodo.chave,
        periodo.inicio,
        periodo.fim,
      );
    }
    registarAuditoria(ator.id, "zona", `Zona da equipa ${equipaId} atualizada a partir de ${entrada.inicio}.`);
  });
}

export function adicionarMembro(ator: Ator, equipaId: string, nome: string): void {
  exigir(podeGerirEquipas(ator), 403, "SEM_PERMISSAO", "Só a central acrescenta técnicos.");
  exigir(nome.trim().length > 1, 400, "DADOS_INVALIDOS", "Indique o nome do técnico.");
  baseDados()
    .prepare("INSERT INTO tecnicos (id, equipa_id, nome, ativo) VALUES (?, ?, ?, 1)")
    .run(`tec-${crypto.randomUUID()}`, equipaId, nome.trim());
  registarAuditoria(ator.id, "tecnico", `${nome.trim()} entrou na equipa ${equipaId}.`);
}

export function desativarMembro(ator: Ator, equipaId: string, tecnicoId: string): void {
  exigir(podeGerirEquipas(ator), 403, "SEM_PERMISSAO", "Só a central desativa técnicos.");
  const linha = baseDados().prepare("SELECT id FROM tecnicos WHERE id = ? AND equipa_id = ?").get(tecnicoId, equipaId);
  exigir(Boolean(linha), 404, "NAO_ENCONTRADO", "Não encontrámos este técnico nesta equipa.");
  baseDados().prepare("UPDATE tecnicos SET ativo = 0 WHERE id = ?").run(tecnicoId);
}

export function adicionarIndisponibilidade(
  ator: Ator,
  equipaId: string,
  entrada: { data: string; inicio: string; fim: string; motivo: string },
): void {
  exigir(podeGerirEquipas(ator), 403, "SEM_PERMISSAO", "Só a central regista indisponibilidades.");
  exigir(eDataIso(entrada.data), 400, "DATA_INVALIDA", "A data tem de estar no formato AAAA-MM-DD.");
  const inicio = parseHHMM(entrada.inicio);
  const fim = parseHHMM(entrada.fim);
  exigir(fim > inicio, 400, "INTERVALO", "O fim tem de ser depois do início.");
  const antes = lerMundo();
  const equipa = antes.equipas.find((linha) => linha.id === equipaId);
  exigir(Boolean(equipa), 404, "NAO_ENCONTRADO", "Não encontrámos esta equipa.");
  const ensaio = structuredClone(antes);
  ensaio.equipas.find((linha) => linha.id === equipaId)!.indisponibilidades.push({
    id: `un-${crypto.randomUUID()}`,
    data: entrada.data,
    inicio: entrada.inicio,
    fim: entrada.fim,
    motivo: entrada.motivo.trim() || "Indisponível",
  });
  if (ordensDoDia(ensaio, equipaId, entrada.data).length > 0 && !diaAceita(ensaio, equipaId, entrada.data)) {
    throw new ErroHttp(
      409,
      "INVIAVEL",
      "Esta indisponibilidade parte o dia: há visitas que deixam de caber na janela e na margem de deslocação.",
    );
  }
  const mundo = recalcularDia(ensaio, equipaId, entrada.data);
  gravarDiferença(ator, antes, mundo, `Indisponibilidade em ${equipa!.nome} a ${entrada.data}.`);
}

export function removerIndisponibilidade(ator: Ator, equipaId: string, indisponibilidadeId: string): void {
  exigir(podeGerirEquipas(ator), 403, "SEM_PERMISSAO", "Só a central remove indisponibilidades.");
  const antes = lerMundo();
  const depois = structuredClone(antes);
  const equipa = depois.equipas.find((linha) => linha.id === equipaId);
  exigir(Boolean(equipa), 404, "NAO_ENCONTRADO", "Não encontrámos esta equipa.");
  const removidas = equipa!.indisponibilidades.filter((bloco) => bloco.id === indisponibilidadeId);
  equipa!.indisponibilidades = equipa!.indisponibilidades.filter((bloco) => bloco.id !== indisponibilidadeId);
  let mundo = depois;
  for (const bloco of removidas) mundo = recalcularDia(mundo, equipaId, bloco.data);
  gravarDiferença(ator, antes, mundo, "Indisponibilidade removida.");
}

export function guardarMargem(ator: Ator, minutos: number): void {
  exigir(ator.papel === "administrador" || ator.papel === "supervisor", 403, "SEM_PERMISSAO", "Só a central muda a margem.");
  exigir(minutos >= 0 && minutos <= 180, 400, "DADOS_INVALIDOS", "A margem fica entre 0 e 180 minutos.");
  const antes = lerMundo();
  const depois = structuredClone(antes);
  depois.margemDeslocacaoMin = minutos;
  const visto = new Set<string>();
  let mundo = depois;
  for (const ordem of depois.ordens) {
    if (!ordem.equipaId || ordem.estado === "cancelada") continue;
    const chave = `${ordem.equipaId}|${ordem.data}`;
    if (visto.has(chave)) continue;
    visto.add(chave);
    mundo = recalcularDia(mundo, ordem.equipaId, ordem.data);
  }
  const partido = mundo.ordens.some((ordem) => ordem.estado === "agendada" && ordem.equipaId && ordem.inicioPlaneado === null);
  if (partido) {
    throw new ErroHttp(409, "INVIAVEL", "Com esta margem há dias que deixam de ter sequência. O valor não foi guardado.");
  }
  transacao(() => {
    definirMargem(minutos);
    sincronizarMundo(antes, mundo, ator.id);
    registarAuditoria(ator.id, "margem", `Margem de deslocação: ${minutos} min.`);
  });
}

export function margemAtual(): number {
  return lerMundo().margemDeslocacaoMin;
}
