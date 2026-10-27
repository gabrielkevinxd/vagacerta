import "server-only";

import { datasUteis, gerarMundo, inicioHorizonte, indicadoresDoDia, type PedidoSimulacao } from "@/lib/gemeo";
import { tipoDeCategoria, categoriaDoTipo } from "@/lib/ofsc/quotas";
import { zonaDaArea } from "@/lib/ofsc/zonas";
import type { ReservaEstruturada } from "@/lib/ofsc/tipos";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";
import { misturarSemente, mulberry32 } from "@/lib/gemeo/rng";
import { ATOR_OFSC } from "@/server/ofsc/recetor";
import { criarAtividadeNoBucket } from "@/server/ofsc/criar";
import { listarGrelha } from "@/server/ofsc/grelha";
import { criarOrdem } from "@/server/servicos";
import { baseDados, diaDemonstracaoAtual, lerMundo } from "@/server/db";
import { ErroHttp } from "@/server/erros";
import type { RelatorioGemeo } from "@/lib/contratos/gemeo";
import { eCentral, type Ator } from "@/lib/rules";
import type { Idioma } from "@/lib/i18n";

export function exigirCentralGemeo(ator: Ator) {
  if (!eCentral(ator)) throw new ErroHttp(403, "SEM_PERMISSAO", "Só a central corre o gémeo digital.");
}

export function idDoLote(semente: number, inicio: string): string {
  return `lote-${semente}-${inicio}`;
}

function marcarLote(loteId: string, ordemId: string | null, activityId: string | null): void {
  const db = baseDados();
  if (ordemId) db.prepare("UPDATE ordens SET lote_id = ? WHERE id = ?").run(loteId, ordemId);
  if (activityId) {
    db.prepare("UPDATE ofsc_atividades SET lote_id = ? WHERE activity_id = ?").run(loteId, activityId);
    db.prepare("UPDATE ofsc_ausencias SET lote_id = ? WHERE activity_id = ?").run(loteId, activityId);
  }
}

export function apagarLote(loteId: string): void {
  const db = baseDados();
  const ordens = db.prepare("SELECT id FROM ordens WHERE lote_id = ?").all(loteId) as { id: string }[];
  for (const ordem of ordens) {
    db.prepare("DELETE FROM historico_ordens WHERE ordem_id = ?").run(ordem.id);
  }
  db.prepare(
    `DELETE FROM ofsc_ausencias WHERE lote_id = ? OR activity_id IN (SELECT activity_id FROM ofsc_atividades WHERE lote_id = ?)`,
  ).run(loteId, loteId);
  db.prepare("DELETE FROM ofsc_atividades WHERE lote_id = ?").run(loteId);
  db.prepare("DELETE FROM lote_recusas WHERE lote_id = ?").run(loteId);
  db.prepare("DELETE FROM indisponibilidades WHERE lote_id = ?").run(loteId);
  db.prepare("DELETE FROM ordens WHERE lote_id = ?").run(loteId);
  db.prepare("DELETE FROM lotes_simulacao WHERE id = ?").run(loteId);
}

export function listarLotes() {
  return baseDados()
    .prepare("SELECT id, semente, inicio, semanas, criado_em FROM lotes_simulacao ORDER BY criado_em DESC")
    .all() as { id: string; semente: number; inicio: string; semanas: number; criado_em: string }[];
}

export function relatorioDoLote(loteId: string, idioma: Idioma = "pt-PT"): RelatorioGemeo {
  const lote = baseDados().prepare("SELECT * FROM lotes_simulacao WHERE id = ?").get(loteId) as
    | { id: string; semente: number; inicio: string; semanas: number }
    | undefined;
  if (!lote) throw new ErroHttp(404, "NAO_ENCONTRADO", "Não encontrámos este lote de simulação.");
  const datas = datasUteis(lote.inicio, lote.semanas);
  const mundo = lerMundo();
  const ator: Ator = ATOR_OFSC;
  const ordens = baseDados()
    .prepare("SELECT * FROM ordens WHERE lote_id = ?")
    .all(loteId) as { estado: string; operador_id: string; data: string }[];
  const recusas = baseDados()
    .prepare("SELECT COUNT(*) AS n FROM lote_recusas WHERE lote_id = ?")
    .get(loteId) as { n: number };
  const aceites = ordens.filter((o) => o.estado === "agendada" || o.estado === "em_curso" || o.estado === "concluida").length;
  const espera = ordens.filter((o) => o.estado === "em_espera").length;
  const recusadas = Number(recusas.n) + espera;
  let minutosOcupados = 0;
  let minutosOciosos = 0;
  let minutosCapacidade = 0;
  const serieDiaria = datas.map((data) => {
    const ind = indicadoresDoDia(mundo, data, ator);
    minutosOcupados += ind.minutosOcupados;
    minutosOciosos += ind.minutosOciosos;
    minutosCapacidade += ind.minutosCapacidade;
    return {
      data,
      utilizacao: ind.utilizacao,
      recusadas: ind.recusadas,
      sobreReservasEvitadas: ind.sobreReservasEvitadas,
    };
  });
  const utilizacao = minutosCapacidade === 0 ? 0 : minutosOcupados / minutosCapacidade;
  const nota =
    idioma === "en"
      ? `Batch ${loteId}: seed ${lote.semente}. ${aceites} accepted, ${espera} on the waiting list, ${Number(recusas.n)} refusals. Indicators come from the database after injection.`
      : `Lote ${loteId}: semente ${lote.semente}. ${aceites} aceites, ${espera} em fila de espera, ${Number(recusas.n)} recusas. Os indicadores vêm da base depois da injeção.`;
  return {
    semente: lote.semente,
    replicas: 1,
    semanas: lote.semanas,
    ordensGeradas: aceites + recusadas,
    politicas: [
      {
        id: "partilhada",
        aceites,
        recusadas,
        sobreReservas: 0,
        sobreReservasEvitadas: 0,
        minutosOcupados,
        minutosOciosos,
        minutosCapacidade,
        utilizacao,
      },
    ],
    serieDiaria,
    nota,
    comparacao: (["azul", "vermelho", "verde"] as const).map((operadorId) => ({
      operadorId,
      aceitesPartilhadas: ordens.filter(
        (o) => o.operador_id === operadorId && (o.estado === "agendada" || o.estado === "em_curso" || o.estado === "concluida"),
      ).length,
      aceitesIndependentes: 0,
    })),
  };
}

export async function injetarLote(pedido: PedidoSimulacao): Promise<{ loteId: string; relatorio: RelatorioGemeo }> {
  const mundo = lerMundo();
  const horizonte = inicioHorizonte(diaDemonstracaoAtual());
  const datas = datasUteis(horizonte, pedido.semanas);
  const inicio = datas[0] ?? horizonte;
  const loteId = idDoLote(pedido.semente, inicio);
  apagarLote(loteId);
  baseDados()
    .prepare("INSERT INTO lotes_simulacao (id, semente, inicio, semanas, criado_em) VALUES (?, ?, ?, ?, ?)")
    .run(loteId, pedido.semente, inicio, pedido.semanas, new Date().toISOString());

  const gerado = gerarMundo(mulberry32(misturarSemente(pedido.semente, 0)), pedido, datas, mundo.equipas);
  for (const equipa of gerado.equipas) {
    for (const bloco of equipa.indisponibilidades) {
      baseDados()
        .prepare(
          "INSERT INTO indisponibilidades (id, equipa_id, data, inicio, fim, motivo, lote_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(`${loteId}-${bloco.id}`, equipa.id, bloco.data, bloco.inicio, bloco.fim, bloco.motivo, loteId);
    }
  }

  let seq = 0;
  for (const chegada of gerado.chegadas) {
    seq += 1;
    if (!eOperadorOfsc(chegada.operadorId)) continue;
    const tipo = tipoDeCategoria(chegada.categoria);
    const zona = zonaDaArea(chegada.area);
    const celulas = listarGrelha(chegada.operadorId, chegada.data, zona, tipo);
    const celula =
      celulas.find((c) => c.janelaInicio === chegada.janelaInicio && c.janelaFim === chegada.janelaFim) ?? celulas[0];
    const apptNumber = `${chegada.referencia}-GM${pedido.semente}-${seq}`;
    const reserva: ReservaEstruturada = {
      operadorId: chegada.operadorId,
      zona,
      data: chegada.data,
      janelaInicio: chegada.janelaInicio,
      janelaFim: chegada.janelaFim,
      tipoIntervencao: tipo,
      resourceId: celula?.resourceId ?? "",
      tecnicoId: celula?.tecnicoId ?? null,
      apptNumber,
      customerName: `Simulação ${loteId}`,
      streetAddress: chegada.area,
      city: chegada.area,
      postalCode: "",
      latitude: "",
      longitude: "",
    };

    if (!reserva.resourceId) {
      baseDados()
        .prepare(
          "INSERT INTO lote_recusas (id, lote_id, referencia, operador_id, data, motivo, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(`rec-${crypto.randomUUID()}`, loteId, apptNumber, chegada.operadorId, chegada.data, "Técnico indisponível", "sem vaga na grelha");
      try {
        const espera = criarOrdem(ATOR_OFSC, {
          operadorId: chegada.operadorId,
          referencia: apptNumber,
          area: chegada.area,
          zonaId: zona,
          categoria: categoriaDoTipo(tipo),
          tecnologia: chegada.tecnologia,
          data: chegada.data,
          janelaInicio: chegada.janelaInicio,
          janelaFim: chegada.janelaFim,
          prioridade: "media",
          clienteNome: `Simulação ${loteId}`,
          clienteContacto: "000000000",
          morada: chegada.area,
          nota: loteId,
          equipaId: null,
          modo: "espera",
        });
        marcarLote(loteId, espera.id, null);
      } catch {
        /* referência ou catálogo */
      }
      continue;
    }

    let criado;
    try {
      criado = await criarAtividadeNoBucket(reserva);
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : "falha OFSC";
      baseDados()
        .prepare(
          "INSERT INTO lote_recusas (id, lote_id, referencia, operador_id, data, motivo, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(`rec-${crypto.randomUUID()}`, loteId, apptNumber, chegada.operadorId, chegada.data, "Técnico indisponível", detalhe);
      continue;
    }
    marcarLote(loteId, criado.resultado.ordemId, criado.atividade.activityId);
    if (criado.resultado.decisao !== "Reserva Confirmada") {
      baseDados()
        .prepare(
          "INSERT INTO lote_recusas (id, lote_id, referencia, operador_id, data, motivo, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          `rec-${crypto.randomUUID()}`,
          loteId,
          apptNumber,
          chegada.operadorId,
          chegada.data,
          criado.resultado.motivo ?? criado.resultado.decisao,
          criado.resultado.resultado,
        );
      if (criado.resultado.motivo === "Capacidade Esgotada" && !criado.resultado.ordemId) {
        try {
          const espera = criarOrdem(ATOR_OFSC, {
            operadorId: chegada.operadorId,
            referencia: `${apptNumber}-E`,
            area: chegada.area,
            zonaId: zona,
            categoria: categoriaDoTipo(tipo),
            tecnologia: chegada.tecnologia,
            data: chegada.data,
            janelaInicio: chegada.janelaInicio,
            janelaFim: chegada.janelaFim,
            prioridade: "media",
            clienteNome: `Simulação ${loteId}`,
            clienteContacto: "000000000",
            morada: chegada.area,
            nota: loteId,
            equipaId: null,
            modo: "espera",
          });
          marcarLote(loteId, espera.id, criado.atividade.activityId);
        } catch {
          /* já existe */
        }
      }
    }
  }

  return { loteId, relatorio: relatorioDoLote(loteId) };
}

export function totaisDoLote(loteId: string) {
  const aceites = baseDados()
    .prepare(
      `SELECT COUNT(*) AS n FROM ordens WHERE lote_id = ? AND estado IN ('agendada','em_curso','concluida')`,
    )
    .get(loteId) as { n: number };
  const espera = baseDados()
    .prepare(`SELECT COUNT(*) AS n FROM ordens WHERE lote_id = ? AND estado = 'em_espera'`)
    .get(loteId) as { n: number };
  const recusas = baseDados().prepare(`SELECT COUNT(*) AS n FROM lote_recusas WHERE lote_id = ?`).get(loteId) as { n: number };
  const ordens = baseDados().prepare(`SELECT COUNT(*) AS n FROM ordens WHERE lote_id = ?`).get(loteId) as { n: number };
  return {
    aceites: Number(aceites.n),
    espera: Number(espera.n),
    recusas: Number(recusas.n),
    ordens: Number(ordens.n),
  };
}

