import "server-only";

import { prepararContexto, resumoCompacto, type ContextoRegras } from "@/lib/assistente/analise";
import { descreverAlertas, textoDe } from "@/lib/assistente/frases";
import { pedidoDaFerramenta, responderPorRegras, type Leitura } from "@/lib/assistente/regras";
import { falarComXai } from "@/lib/assistente/xai";
import type { PainelAssistente, PedidoAssistente, RespostaAssistente } from "@/lib/contratos/assistente";
import { t } from "@/lib/i18n";
import { traduzirMensagem, traduzirPlanoVista } from "@/lib/i18n/motor";
import { chaveXai, modeloXai } from "@/lib/ofsc/xai";
import { eDataIso, hojeLisboa, type Ator, type PedidoRealocacao, type PlanoVista } from "@/lib/rules";
import { baseDados, lerMundo } from "./db";
import { ErroHttp } from "./erros";
import { idiomaAtual, mensagensAtuais } from "./idioma";
import { confirmarPlano, previsualizar } from "./servicos";

function agora(): string {
  return new Date().toISOString();
}

function origem(modo: "ia" | "sem_ia"): string {
  const m = mensagensAtuais();
  return modo === "ia" ? t(m, "assistente.modoIa", { modelo: modeloXai() }) : t(m, "assistente.modoSemIa");
}

function responder(texto: string, intencao: RespostaAssistente["intencao"], plano: PlanoVista | null, modo: "ia" | "sem_ia", gravado: boolean): RespostaAssistente {
  return {
    mensagem: { papel: "assistente", texto, em: agora() },
    intencao,
    plano,
    modo,
    gravado,
    origem: origem(modo),
  };
}

function tecnicosAtivos(): { equipaId: string; ativos: number }[] {
  const linhas = baseDados()
    .prepare(
      `SELECT equipa_id AS equipaId, SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) AS ativos
       FROM tecnicos GROUP BY equipa_id`,
    )
    .all() as { equipaId: string; ativos: number }[];
  return linhas.map((linha) => ({ equipaId: String(linha.equipaId), ativos: Number(linha.ativos) }));
}

export function diaDoAssistente(valor: string | undefined): string {
  return valor && eDataIso(valor) ? valor : hojeLisboa();
}

function contexto(ator: Ator, data: string): ContextoRegras {
  return prepararContexto(lerMundo(), ator, data, tecnicosAtivos());
}

export function painelAssistente(ator: Ator, data: string): PainelAssistente {
  const m = mensagensAtuais();
  const ctx = contexto(ator, data);
  return {
    data,
    modoChat: chaveXai() ? "ia" : "sem_ia",
    modelo: chaveXai() ? modeloXai() : null,
    podePropor: ator.papel !== "tecnico",
    resumo: t(m, "assistente.resumoDia", {
      data: ctx.data,
      agendadas: ctx.contagens.agendadas,
      espera: ctx.contagens.espera,
      pendentes: ctx.contagens.pendentes,
      curso: ctx.contagens.emCurso,
      margem: ctx.margem,
      alertas: ctx.factos.length,
    }),
    alertas: descreverAlertas(m, ctx.factos),
  };
}

function deLeitura(ator: Ator, leitura: Exclude<Leitura, { tipo: "ambiguo" }>, ctx: ContextoRegras, modo: "ia" | "sem_ia"): RespostaAssistente {
  const m = mensagensAtuais();
  const alertas = descreverAlertas(m, ctx.factos);
  const texto = textoDe(m, leitura, alertas);
  if (leitura.tipo === "recusar") {
    return responder(texto, { tipo: "recusar", mensagem: texto }, null, modo, false);
  }
  if (leitura.tipo === "esclarecer") {
    return responder(texto, { tipo: "esclarecer", pergunta: leitura.pergunta }, null, modo, false);
  }
  return prever(ator, leitura.pedido, texto, modo);
}

function prever(ator: Ator, pedido: PedidoRealocacao, prefixo: string, modo: "ia" | "sem_ia"): RespostaAssistente {
  const m = mensagensAtuais();
  try {
    const plano = traduzirPlanoVista(m, previsualizar(ator, pedido));
    const nota = plano.viavel ? t(m, "assistente.nadaGravado") : t(m, "assistente.planoRecusado");
    const texto = `${prefixo} ${plano.mensagem} ${nota}`.replace(/\s+/g, " ").trim();
    return responder(texto, { tipo: "reencaixar", pedido }, plano, modo, false);
  } catch (erro) {
    if (erro instanceof ErroHttp) {
      const texto = traduzirMensagem(m, erro.message, erro.codigo);
      return responder(texto, { tipo: "recusar", mensagem: texto }, null, modo, false);
    }
    throw erro;
  }
}

export function responderAssistente(ator: Ator, corpo: PedidoAssistente): Promise<RespostaAssistente> | RespostaAssistente {
  const m = mensagensAtuais();
  const data = diaDoAssistente(corpo.data);
  const ctx = contexto(ator, data);

  if (corpo.confirmar) {
    if (ator.papel === "tecnico") return deLeitura(ator, { tipo: "recusar", chave: "assistente.tecnicoNaoGrava", vars: {} }, ctx, "sem_ia");
    try {
      const plano = traduzirPlanoVista(m, confirmarPlano(ator, corpo.confirmar.pedido, corpo.confirmar.selo));
      const texto = `${t(m, "assistente.gravado")} ${plano.mensagem}`.replace(/\s+/g, " ").trim();
      return responder(texto, { tipo: "reencaixar", pedido: corpo.confirmar.pedido }, plano, "sem_ia", true);
    } catch (erro) {
      if (erro instanceof ErroHttp) {
        const texto = traduzirMensagem(m, erro.message, erro.codigo);
        return responder(texto, { tipo: "recusar", mensagem: texto }, null, "sem_ia", false);
      }
      throw erro;
    }
  }

  if (corpo.propor) {
    const pedido = corpo.propor;
    const chave = pedido.equipaEmFalta
      ? "assistente.reencaixeFalta"
      : pedido.encaixarId
        ? "assistente.reencaixeEncaixe"
        : "assistente.reencaixeEquilibrio";
    const prefixo = textoDe(m, {
      tipo: "reencaixar",
      pedido,
      chave,
      vars: {
        ref: ctx.espera.find((linha) => linha.id === pedido.encaixarId)?.referencia ?? ctx.ordens.find((linha) => linha.id === pedido.encaixarId)?.referencia ?? "",
        equipa: ctx.equipas.find((linha) => linha.id === pedido.equipaEmFalta)?.nome ?? "",
      },
    });
    return prever(ator, pedido, prefixo, "sem_ia");
  }

  const leitura = responderPorRegras(corpo.texto, ctx);
  if (leitura.tipo !== "ambiguo") return deLeitura(ator, leitura, ctx, "sem_ia");

  return falarComXai({
    texto: corpo.texto,
    historico: corpo.historico ?? [],
    idioma: idiomaAtual(),
    resumo: resumoCompacto(ctx),
    executar: (nome, args) => {
      if (nome === "propor_reencaixe") return pedidoDaFerramenta(args, ctx) ? "aceite" : "indisponivel";
      if (nome === "listar_alertas") return ctx.factos.map((facto) => facto.tipo).slice(0, 8).join(",") || "nenhum";
      return resumoCompacto(ctx).slice(0, 500);
    },
  }).then((resultado) => {
    if (resultado.modo === "sem_ia") {
      return deLeitura(ator, { tipo: "esclarecer", chave: "assistente.generico", vars: { n: ctx.factos.length }, pergunta: corpo.texto }, ctx, "sem_ia");
    }
    const proposta = resultado.ferramentas.find((chamada) => chamada.nome === "propor_reencaixe");
    if (proposta) {
      const pedido = pedidoDaFerramenta(proposta.args, ctx);
      if (pedido) {
        const chave = proposta.args.modo === "falta" ? "assistente.reencaixeFalta" : proposta.args.modo === "equilibrar" ? "assistente.reencaixeEquilibrio" : "assistente.reencaixeEncaixe";
        const ref = ctx.espera.find((linha) => linha.id === pedido.encaixarId)?.referencia ?? "";
        const equipa = ctx.equipas.find((linha) => linha.id === pedido.equipaEmFalta)?.nome ?? "";
        const prefixo = textoDe(m, { tipo: "reencaixar", pedido, chave, vars: { ref, equipa } });
        return prever(ator, pedido, prefixo, "ia");
      }
    }
    const livre = resultado.texto.trim();
    if (livre) return responder(livre, { tipo: "esclarecer", pergunta: corpo.texto }, null, "ia", false);
    if (resultado.ferramentas.some((chamada) => chamada.nome === "listar_alertas")) {
      const leituraAlertas = responderPorRegras("conflitos", ctx);
      if (leituraAlertas.tipo !== "ambiguo") return deLeitura(ator, leituraAlertas, ctx, "ia");
    }
    return deLeitura(ator, { tipo: "esclarecer", chave: "assistente.generico", vars: { n: ctx.factos.length }, pergunta: corpo.texto }, ctx, "sem_ia");
  });
}
