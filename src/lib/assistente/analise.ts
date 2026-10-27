import type { TipoAlerta } from "@/lib/contratos/assistente";
import { tipoDeCategoria, unidadesOcupadas, vagasRestantes } from "@/lib/ofsc/quotas";
import {
  eCentral,
  ordensDoDia,
  podeLerOrdem,
  podeMarcarOperador,
  podeVerEquipa,
  utilizacaoDoDia,
  diaSemanaIso,
  parseHHMM,
  type Ator,
  type Mundo,
  type Ordem,
  type PedidoRealocacao,
  type Prioridade,
} from "@/lib/rules";

export interface ContagemTecnicos {
  equipaId: string;
  ativos: number;
}

export interface FactoAlerta {
  tipo: TipoAlerta;
  gravidade: "alta" | "media";
  data: string;
  equipaId?: string;
  equipaNome?: string;
  ordemId?: string;
  referencia?: string;
  oculta?: boolean;
  percentagem?: number;
  minutos?: number;
  vagasInstalacao?: number;
  vagasManutencao?: number;
  motivo?: string;
  estado?: string;
  total?: boolean;
  pedido?: PedidoRealocacao;
}

export interface OrdemCurta {
  id: string;
  referencia: string;
  estado: string;
  equipaNome: string | null;
  prioridade: Prioridade;
}

export interface ContextoRegras {
  ator: Ator;
  data: string;
  margem: number;
  factos: FactoAlerta[];
  espera: { id: string; referencia: string; prioridade: Prioridade }[];
  ordens: OrdemCurta[];
  equipas: { id: string; nome: string; percentagem: number }[];
  contagens: { agendadas: number; espera: number; pendentes: number; emCurso: number };
  ausencias: { id: string; nome: string; total: boolean; motivo: string }[];
}

const PESO: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

function minutos(valor: string | null | undefined): number | null {
  if (!valor || !/^\d{2}:\d{2}$/.test(valor)) return null;
  try {
    return parseHHMM(valor);
  } catch {
    return null;
  }
}

function turnoDe(equipa: Mundo["equipas"][number], data: string): { inicio: number; fim: number } | null {
  const horario = equipa.horarios.find((linha) => linha.diaSemana === diaSemanaIso(data));
  if (!horario) return null;
  const inicio = minutos(horario.inicio);
  const fim = minutos(horario.fim);
  if (inicio === null || fim === null || fim <= inicio) return null;
  return { inicio, fim };
}

function ausenciaDe(
  equipa: Mundo["equipas"][number],
  data: string,
  ativos: number | null,
): { total: boolean; motivo: string } | null {
  if (!equipa.ativa) return { total: true, motivo: "inativa" };
  if (ativos === 0) return { total: true, motivo: "sem_tecnicos" };
  const turno = turnoDe(equipa, data);
  const blocos = equipa.indisponibilidades.filter((linha) => linha.data === data);
  if (!turno || blocos.length === 0) return null;
  for (const bloco of blocos) {
    const inicio = minutos(bloco.inicio);
    const fim = minutos(bloco.fim);
    if (inicio === null || fim === null) continue;
    if (inicio <= turno.inicio && fim >= turno.fim) return { total: true, motivo: bloco.motivo };
  }
  const motivo = blocos.map((bloco) => `${bloco.inicio}–${bloco.fim} ${bloco.motivo}`).join("; ");
  return { total: false, motivo };
}

function pedidoEncaixe(ator: Ator, ordem: Ordem): PedidoRealocacao | undefined {
  if (ordem.estado !== "em_espera" || !podeMarcarOperador(ator, ordem.operadorId)) return undefined;
  return { encaixarId: ordem.id, data: ordem.data, permitirTroca: eCentral(ator) };
}

export function detetarFactos(mundo: Mundo, ator: Ator, data: string, tecnicos: ContagemTecnicos[] = []): FactoAlerta[] {
  const factos: FactoAlerta[] = [];
  const nomes = new Map(mundo.equipas.map((equipa) => [equipa.id, equipa.nome]));

  for (const equipa of mundo.equipas) {
    if (!podeVerEquipa(ator, equipa.id)) continue;
    const linhaTecnicos = tecnicos.find((linha) => linha.equipaId === equipa.id);
    const ausencia = ausenciaDe(equipa, data, linhaTecnicos ? linhaTecnicos.ativos : null);
    if (ausencia) {
      const pedido =
        ausencia.total && eCentral(ator)
          ? { equipaEmFalta: equipa.id, data, permitirTroca: true }
          : undefined;
      factos.push({
        tipo: "tecnico_ausente",
        gravidade: ausencia.total ? "alta" : "media",
        data,
        equipaId: equipa.id,
        equipaNome: equipa.nome,
        motivo: ausencia.motivo,
        total: ausencia.total,
        pedido,
      });
    }

    const ocupacao = ordensDoDia(mundo, equipa.id, data);
    const contagem = { instalacao: 0, manutencao: 0, adicional: 0 };
    for (const ordem of ocupacao) contagem[tipoDeCategoria(ordem.categoria)] += 1;
    const unidades = unidadesOcupadas(contagem);
    const vagasInstalacao = vagasRestantes(unidades, "instalacao");
    const vagasManutencao = vagasRestantes(unidades, "manutencao");
    if (ocupacao.length > 0 && (vagasInstalacao === 0 || vagasManutencao === 0)) {
      factos.push({
        tipo: "quota_esgotada",
        gravidade: vagasInstalacao === 0 && vagasManutencao === 0 ? "alta" : "media",
        data,
        equipaId: equipa.id,
        equipaNome: equipa.nome,
        vagasInstalacao,
        vagasManutencao,
      });
    }

    const planeadas = ocupacao
      .map((ordem) => ({ ordem, inicio: minutos(ordem.inicioPlaneado), fim: minutos(ordem.fimPlaneado) }))
      .filter((linha): linha is { ordem: Ordem; inicio: number; fim: number } => linha.inicio !== null && linha.fim !== null && linha.fim > linha.inicio)
      .sort((a, b) => a.inicio - b.inicio || a.ordem.referencia.localeCompare(b.ordem.referencia));
    for (let indice = 1; indice < planeadas.length; indice += 1) {
      const anterior = planeadas[indice - 1]!;
      const atual = planeadas[indice]!;
      const cruza = atual.inicio < anterior.fim;
      const semMargem = !cruza && atual.inicio < anterior.fim + mundo.margemDeslocacaoMin;
      if (!cruza && !semMargem) continue;
      const veAnterior = podeLerOrdem(ator, anterior.ordem);
      const veAtual = podeLerOrdem(ator, atual.ordem);
      if (!veAnterior && !veAtual) continue;
      const referencias = [veAnterior ? anterior.ordem.referencia : null, veAtual ? atual.ordem.referencia : null].filter(
        (valor): valor is string => Boolean(valor),
      );
      factos.push({
        tipo: "sobreposicao",
        gravidade: cruza ? "alta" : "media",
        data,
        equipaId: equipa.id,
        equipaNome: equipa.nome,
        ordemId: veAtual ? atual.ordem.id : anterior.ordem.id,
        referencia: referencias.join(" · "),
        oculta: !(veAnterior && veAtual),
        motivo: cruza ? "cruza" : "margem",
        minutos: mundo.margemDeslocacaoMin,
      });
    }
  }

  for (const linha of utilizacaoDoDia(mundo, data)) {
    if (!podeVerEquipa(ator, linha.equipaId) || linha.ocupadoMin <= 0) continue;
    if (linha.turnoMin > 0 && linha.ocupadoMin <= linha.turnoMin) continue;
    factos.push({
      tipo: "sobrelotacao",
      gravidade: "alta",
      data,
      equipaId: linha.equipaId,
      equipaNome: linha.nome,
      percentagem: linha.turnoMin === 0 ? 100 : linha.percentagem,
      minutos: linha.ocupadoMin,
    });
  }

  const semTecnico = mundo.ordens
    .filter(
      (ordem) =>
        ordem.data === data &&
        podeLerOrdem(ator, ordem) &&
        (ordem.estado === "em_espera" || ordem.estado === "pendente" || (ordem.estado === "agendada" && !ordem.equipaId)),
    )
    .sort(
      (a, b) =>
        PESO[a.prioridade] - PESO[b.prioridade] || a.referencia.localeCompare(b.referencia),
    )
    .slice(0, 6);
  for (const ordem of semTecnico) {
    factos.push({
      tipo: "sem_tecnico",
      gravidade: ordem.prioridade === "alta" ? "alta" : "media",
      data,
      ordemId: ordem.id,
      referencia: ordem.referencia,
      estado: ordem.estado,
      equipaNome: ordem.equipaId ? nomes.get(ordem.equipaId) : undefined,
      pedido: pedidoEncaixe(ator, ordem),
    });
  }

  const pesoTipo: Record<TipoAlerta, number> = {
    sobreposicao: 0,
    tecnico_ausente: 1,
    quota_esgotada: 2,
    sobrelotacao: 3,
    sem_tecnico: 4,
  };
  return factos
    .sort(
      (a, b) =>
        (a.gravidade === "alta" ? 0 : 1) - (b.gravidade === "alta" ? 0 : 1) ||
        pesoTipo[a.tipo] - pesoTipo[b.tipo] ||
        (a.equipaNome ?? "").localeCompare(b.equipaNome ?? ""),
    )
    .slice(0, 12);
}

export function prepararContexto(mundo: Mundo, ator: Ator, data: string, tecnicos: ContagemTecnicos[] = []): ContextoRegras {
  const factos = detetarFactos(mundo, ator, data, tecnicos);
  const nomes = new Map(mundo.equipas.map((equipa) => [equipa.id, equipa.nome]));
  const visiveis = mundo.ordens.filter((ordem) => ordem.data === data && podeLerOrdem(ator, ordem));
  const ordens: OrdemCurta[] = visiveis.map((ordem) => ({
    id: ordem.id,
    referencia: ordem.referencia,
    estado: ordem.estado,
    equipaNome: ordem.equipaId ? (nomes.get(ordem.equipaId) ?? null) : null,
    prioridade: ordem.prioridade,
  }));
  const espera = ordens
    .filter((ordem) => ordem.estado === "em_espera")
    .map((ordem) => ({ id: ordem.id, referencia: ordem.referencia, prioridade: ordem.prioridade }))
    .sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || a.referencia.localeCompare(b.referencia));
  const equipas = utilizacaoDoDia(mundo, data)
    .filter((linha) => podeVerEquipa(ator, linha.equipaId))
    .map((linha) => ({ id: linha.equipaId, nome: linha.nome, percentagem: linha.percentagem }));
  return {
    ator,
    data,
    margem: mundo.margemDeslocacaoMin,
    factos,
    espera,
    ordens,
    equipas,
    contagens: {
      agendadas: visiveis.filter((ordem) => ordem.estado === "agendada").length,
      espera: visiveis.filter((ordem) => ordem.estado === "em_espera").length,
      pendentes: visiveis.filter((ordem) => ordem.estado === "pendente").length,
      emCurso: visiveis.filter((ordem) => ordem.estado === "em_curso").length,
    },
    ausencias: factos
      .filter((facto) => facto.tipo === "tecnico_ausente" && facto.equipaId && facto.equipaNome)
      .map((facto) => ({
        id: facto.equipaId!,
        nome: facto.equipaNome!,
        total: Boolean(facto.total),
        motivo: facto.motivo ?? "",
      })),
  };
}

/** Linha curta para o modelo. Sem fichas e sem referências de outro operador. */
export function resumoCompacto(ctx: ContextoRegras): string {
  const equipas = ctx.equipas.map((equipa) => `${equipa.nome} ${equipa.percentagem}%`).join(", ");
  const fila = ctx.espera.map((ordem) => ordem.referencia).join(",");
  const tipos = ctx.factos.map((facto) => facto.tipo).join(",");
  return [
    `data=${ctx.data}`,
    `papel=${ctx.ator.papel}`,
    `op=${ctx.ator.operadorId ?? "-"}`,
    `margem=${ctx.margem}`,
    `agendadas=${ctx.contagens.agendadas}`,
    `espera=${ctx.contagens.espera}`,
    `pendentes=${ctx.contagens.pendentes}`,
    `curso=${ctx.contagens.emCurso}`,
    `equipas=${equipas}`,
    `fila=${fila}`,
    `alertas=${tipos}`,
  ].join(" ");
}
