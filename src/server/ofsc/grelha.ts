import "server-only";

import {
  cabeNaQuota,
  categoriaDoTipo,
  tipoDeCategoria,
  unidadesOcupadas,
  vagasRestantes,
  type MotivoRecusa,
  type TipoIntervencao,
} from "@/lib/ofsc/quotas";
import type { OperadorOfsc } from "@/lib/ofsc/tipos";
import { diaAceita, duracaoMinutos, janelasDe, parseHHMM, restricoesDaEquipa, vigenteEm, type Mundo } from "@/lib/rules";
import { baseDados, lerMundo } from "@/server/db";
import { recursoDaEquipa } from "./loja";

export interface CelulaVaga {
  zonaId: string;
  zonaNome: string;
  equipaId: string;
  equipaNome: string;
  tecnicoId: string;
  tecnicoNome: string;
  resourceId: string;
  tipo: TipoIntervencao;
  janelaInicio: string;
  janelaFim: string;
  vagasTipo: number;
  vagasInstalacao: number;
  vagasManutencao: number;
}

export interface Avaliacao {
  ok: boolean;
  motivo?: MotivoRecusa;
  alternativa?: CelulaVaga | null;
  celula?: CelulaVaga;
  ocupadas: number;
  vagasDe: number;
  vagasPara: number;
}

function nomeZona(zonaId: string): string {
  const linha = baseDados().prepare("SELECT nome FROM zonas WHERE id = ?").get(zonaId) as { nome: string } | undefined;
  return linha?.nome ?? zonaId;
}

function vigenciasDaZona(zonaId: string, data: string): string[] {
  const linhas = baseDados()
    .prepare("SELECT equipa_id, inicio, fim FROM equipa_zona WHERE zona_id = ?")
    .all(zonaId) as { equipa_id: string; inicio: string; fim: string | null }[];
  return linhas.filter((linha) => vigenteEm([linha], data)).map((linha) => linha.equipa_id);
}

function tecnicosDaEquipa(equipaId: string): { id: string; nome: string }[] {
  return (
    baseDados()
      .prepare("SELECT id, nome FROM tecnicos WHERE equipa_id = ? AND ativo = 1 ORDER BY nome")
      .all(equipaId) as { id: string; nome: string }[]
  );
}

export function ocupacaoDoRecurso(equipaId: string, data: string): { instalacao: number; manutencao: number; adicional: number } {
  const linhas = baseDados()
    .prepare(
      `SELECT categoria FROM ordens WHERE equipa_id = ? AND data = ? AND estado IN ('agendada','em_curso','concluida')`,
    )
    .all(equipaId, data) as { categoria: string }[];
  const contagem = { instalacao: 0, manutencao: 0, adicional: 0 };
  for (const linha of linhas) {
    const tipo = tipoDeCategoria(linha.categoria);
    contagem[tipo] += 1;
  }
  return contagem;
}

function janelaCobreIndisp(inicio: string, fim: string, bloco: { inicio: string; fim: string }): boolean {
  return parseHHMM(inicio) < parseHHMM(bloco.fim) && parseHHMM(fim) > parseHHMM(bloco.inicio);
}

function tecnicoDisponivel(mundo: Mundo, equipaId: string, data: string, inicio: string, fim: string): boolean {
  const equipa = mundo.equipas.find((linha) => linha.id === equipaId);
  if (!equipa?.ativa) return false;
  if (!restricoesDaEquipa(equipa, data, mundo.margemDeslocacaoMin)) return false;
  return !equipa.indisponibilidades.some((bloco) => bloco.data === data && janelaCobreIndisp(inicio, fim, bloco));
}

export function listarGrelha(operadorId: OperadorOfsc, data: string, zonaId?: string, tipo?: TipoIntervencao): CelulaVaga[] {
  const mundo = lerMundo();
  const zonas = zonaId
    ? [{ id: zonaId, nome: nomeZona(zonaId) }]
    : (baseDados().prepare("SELECT id, nome FROM zonas ORDER BY nome").all() as { id: string; nome: string }[]);
  const tipos: TipoIntervencao[] = tipo ? [tipo] : ["instalacao", "manutencao", "adicional"];
  const celulas: CelulaVaga[] = [];

  for (const zona of zonas) {
    const equipasZona = vigenciasDaZona(zona.id, data);
    for (const equipaId of equipasZona) {
      const equipa = mundo.equipas.find((linha) => linha.id === equipaId);
      if (!equipa) continue;
      const resourceId = recursoDaEquipa(operadorId, equipaId);
      if (!resourceId) continue;
      const ocupadas = unidadesOcupadas(ocupacaoDoRecurso(equipaId, data));
      const tecnicos = tecnicosDaEquipa(equipaId);
      for (const tipoAtual of tipos) {
        const categoria = categoriaDoTipo(tipoAtual);
        const servidos = equipa.operadoresServidos?.length
          ? equipa.operadoresServidos
          : equipa.competencias.map((c) => c.operadorId);
        if (!servidos.includes(operadorId)) continue;
        if (!equipa.competencias.some((c) => c.operadorId === operadorId && c.categorias.includes(categoria))) continue;
        const janelas = janelasDe(operadorId, categoria);
        for (const janela of janelas) {
          if (!tecnicoDisponivel(mundo, equipaId, data, janela.inicio, janela.fim)) continue;
          if (!cabeNaQuota(ocupadas, tipoAtual)) continue;
          const duracao = duracaoMinutos(operadorId, categoria, operadorId === "verde" ? "FTTH" : null) ?? 60;
          const trabalho = {
            id: `grelha-${equipaId}-${janela.id}`,
            janelaInicio: parseHHMM(janela.inicio),
            janelaFim: parseHHMM(janela.fim),
            duracao,
          };
          if (!diaAceita(mundo, equipaId, data, [trabalho])) continue;
          for (const tecnico of tecnicos) {
            celulas.push({
              zonaId: zona.id,
              zonaNome: zona.nome,
              equipaId,
              equipaNome: equipa.nome,
              tecnicoId: tecnico.id,
              tecnicoNome: tecnico.nome,
              resourceId,
              tipo: tipoAtual,
              janelaInicio: janela.inicio,
              janelaFim: janela.fim,
              vagasTipo: vagasRestantes(ocupadas, tipoAtual),
              vagasInstalacao: vagasRestantes(ocupadas, "instalacao"),
              vagasManutencao: vagasRestantes(ocupadas, "manutencao"),
            });
          }
        }
      }
    }
  }
  return celulas;
}

export function avaliarReserva(entrada: {
  operadorId: OperadorOfsc;
  zona: string;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  tipoIntervencao: TipoIntervencao;
  resourceId: string | null;
  tecnicoId?: string | null;
}): Avaliacao {
  const mundo = lerMundo();
  const alternativa = listarGrelha(entrada.operadorId, entrada.data, entrada.zona, entrada.tipoIntervencao)[0] ?? null;
  const zonaEquipas = vigenciasDaZona(entrada.zona, entrada.data);
  if (zonaEquipas.length === 0) {
    return { ok: false, motivo: "Zona Fechada", alternativa, ocupadas: 0, vagasDe: 0, vagasPara: 0 };
  }

  const categoria = categoriaDoTipo(entrada.tipoIntervencao);
  const janelas = janelasDe(entrada.operadorId, categoria);
  const janelaOk = janelas.some((j) => j.inicio === entrada.janelaInicio && j.fim === entrada.janelaFim);
  if (!janelaOk) {
    return { ok: false, motivo: "Fora da janela", alternativa, ocupadas: 0, vagasDe: 0, vagasPara: 0 };
  }

  let equipaId: string | null = null;
  if (entrada.resourceId) {
    const linha = baseDados()
      .prepare("SELECT equipa_id FROM ofsc_recursos WHERE resource_id = ? AND operador_id = ?")
      .get(entrada.resourceId, entrada.operadorId) as { equipa_id: string } | undefined;
    equipaId = linha?.equipa_id ?? null;
  } else if (entrada.tecnicoId) {
    const linha = baseDados()
      .prepare("SELECT equipa_id FROM tecnicos WHERE id = ? AND ativo = 1")
      .get(entrada.tecnicoId) as { equipa_id: string } | undefined;
    equipaId = linha?.equipa_id ?? null;
  }
  if (!equipaId || !zonaEquipas.includes(equipaId)) {
    return { ok: false, motivo: "Técnico indisponível", alternativa, ocupadas: 0, vagasDe: 0, vagasPara: 0 };
  }
  if (!tecnicoDisponivel(mundo, equipaId, entrada.data, entrada.janelaInicio, entrada.janelaFim)) {
    return { ok: false, motivo: "Técnico indisponível", alternativa, ocupadas: 0, vagasDe: 0, vagasPara: 0 };
  }

  const resourceId = recursoDaEquipa(entrada.operadorId, equipaId);
  const ocupadas = unidadesOcupadas(ocupacaoDoRecurso(equipaId, entrada.data));
  const vagasDe = vagasRestantes(ocupadas, entrada.tipoIntervencao);
  if (!cabeNaQuota(ocupadas, entrada.tipoIntervencao) || vagasDe < 1) {
    return { ok: false, motivo: "Capacidade Esgotada", alternativa, ocupadas, vagasDe, vagasPara: vagasDe };
  }

  const duracao = duracaoMinutos(entrada.operadorId, categoria, entrada.operadorId === "verde" ? "FTTH" : null) ?? 60;
  const trabalho = {
    id: `aval-${equipaId}`,
    janelaInicio: parseHHMM(entrada.janelaInicio),
    janelaFim: parseHHMM(entrada.janelaFim),
    duracao,
  };
  if (!diaAceita(mundo, equipaId, entrada.data, [trabalho])) {
    return { ok: false, motivo: "Capacidade Esgotada", alternativa, ocupadas, vagasDe, vagasPara: vagasDe };
  }

  const tecnicos = tecnicosDaEquipa(equipaId);
  const tecnico =
    tecnicos.find((t) => t.id === entrada.tecnicoId) ??
    tecnicos[0] ?? { id: "", nome: "Técnico 1" };
  const equipa = mundo.equipas.find((e) => e.id === equipaId)!;
  return {
    ok: true,
    celula: {
      zonaId: entrada.zona,
      zonaNome: nomeZona(entrada.zona),
      equipaId,
      equipaNome: equipa.nome,
      tecnicoId: tecnico.id,
      tecnicoNome: tecnico.nome,
      resourceId: resourceId ?? entrada.resourceId ?? "",
      tipo: entrada.tipoIntervencao,
      janelaInicio: entrada.janelaInicio,
      janelaFim: entrada.janelaFim,
      vagasTipo: vagasDe,
      vagasInstalacao: vagasRestantes(ocupadas, "instalacao"),
      vagasManutencao: vagasRestantes(ocupadas, "manutencao"),
    },
    ocupadas,
    vagasDe,
    vagasPara: Math.max(0, vagasDe - 1),
  };
}
