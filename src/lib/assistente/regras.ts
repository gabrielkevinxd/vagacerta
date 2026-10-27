import type { Chave } from "@/lib/i18n";
import { eCentral, type PedidoRealocacao } from "@/lib/rules";
import type { ContextoRegras } from "./analise";

export type Leitura =
  | { tipo: "ambiguo" }
  | { tipo: "reencaixar"; pedido: PedidoRealocacao; chave: Chave; vars: Record<string, string | number> }
  | { tipo: "esclarecer"; chave: Chave; vars: Record<string, string | number>; pergunta: string }
  | { tipo: "recusar"; chave: Chave; vars: Record<string, string | number> };

function semAcento(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function refs(texto: string): string[] {
  return texto.toUpperCase().match(/\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b/g) ?? [];
}

function equipaMencionada(texto: string, equipas: { id: string; nome: string }[]): { id: string; nome: string } | undefined {
  const normalizado = semAcento(texto);
  return equipas.find((equipa) => {
    const nome = semAcento(equipa.nome);
    if (normalizado.includes(nome)) return true;
    const ultimo = nome.split(" ").pop() ?? "";
    return ultimo.length >= 5 && new RegExp(`\\b${ultimo}\\b`).test(normalizado);
  });
}

function esclarecer(chave: Chave, pergunta: string, vars: Record<string, string | number> = {}): Leitura {
  return { tipo: "esclarecer", chave, vars, pergunta };
}

function recusar(chave: Chave, vars: Record<string, string | number> = {}): Leitura {
  return { tipo: "recusar", chave, vars };
}

export function responderPorRegras(texto: string, ctx: ContextoRegras): Leitura {
  const n = semAcento(texto);
  const pergunta = texto.trim();
  const referencias = refs(texto);
  const ref = referencias[0];
  const ordem = ref ? ctx.ordens.find((linha) => linha.referencia.toUpperCase() === ref || linha.id === ref) : undefined;
  const emEspera = ref ? ctx.espera.find((linha) => linha.referencia.toUpperCase() === ref) : ctx.espera[0];

  if (/^(por favor |please )?(confirma|confirmar|confirm|grava|gravar|guardar|save|apply)( isto| o plano| the plan| this)?[.!]?$/.test(n)) {
    return esclarecer("assistente.precisaBotao", pergunta);
  }

  const pedeAcao = /(encaix|reencaix|otimiz|optimi|refit|\bfit\b|\bschedule\b|equilibr|balance|gravar|confirmar)/.test(n) || /\bfalta\b|\bausente\b|\bausencia\b|\babsent\b/.test(n);
  if (ctx.ator.papel === "tecnico" && pedeAcao) return recusar("assistente.tecnicoNaoGrava");

  if (/(?:^|[^a-z])encaix|agendar|\bmarca(?:r)?\b|\bfit\b|\bschedule\b|\bbook\b/.test(n)) {
    if (ordem && ordem.estado === "pendente") return esclarecer("assistente.ordemPendente", pergunta, { ref: ordem.referencia });
    if (!emEspera) return esclarecer("assistente.semFila", pergunta);
    const escolhida = ref ? ctx.espera.find((linha) => linha.referencia.toUpperCase() === ref) : emEspera;
    if (!escolhida) return esclarecer("assistente.ordemFora", pergunta, { ref: ref ?? "" });
    return {
      tipo: "reencaixar",
      pedido: { encaixarId: escolhida.id, data: ctx.data, permitirTroca: eCentral(ctx.ator) },
      chave: "assistente.reencaixeEncaixe",
      vars: { ref: escolhida.referencia },
    };
  }

  if (/(sem tecnico|sem equipa|fila|em espera|waiting|unassigned|por marcar)/.test(n)) {
    if (ctx.contagens.espera + ctx.contagens.pendentes === 0) return esclarecer("assistente.filaVazia", pergunta, { data: ctx.data });
    const lista = ctx.ordens
      .filter((linha) => linha.estado === "em_espera" || linha.estado === "pendente")
      .map((linha) => linha.referencia)
      .join(", ");
    return esclarecer("assistente.fila", pergunta, {
      n: ctx.contagens.espera + ctx.contagens.pendentes,
      lista,
      data: ctx.data,
    });
  }

  if (/\bfalta\b|\bausente\b|\bausencia\b|\babsent\b|\bunavailable\b/.test(n)) {
    if (!eCentral(ctx.ator)) return recusar("assistente.soCentralFalta");
    const pedida = equipaMencionada(texto, ctx.equipas);
    const alvo = pedida ? ctx.ausencias.find((linha) => linha.id === pedida.id) : ctx.ausencias.find((linha) => linha.total) ?? ctx.ausencias[0];
    if (!alvo) return esclarecer("assistente.semFalta", pergunta, { data: ctx.data });
    if (!alvo.total) return esclarecer("assistente.ausenciaParcial", pergunta, { equipa: alvo.nome, motivo: alvo.motivo });
    return {
      tipo: "reencaixar",
      pedido: { equipaEmFalta: alvo.id, data: ctx.data, permitirTroca: true },
      chave: "assistente.reencaixeFalta",
      vars: { equipa: alvo.nome },
    };
  }

  if (/(equilibr|balance|reencaix|refit|optimi|otimiz|alivia|sobrecarg)/.test(n)) {
    const escolhida = emEspera ?? ctx.espera[0];
    if (!escolhida) return esclarecer("assistente.semFila", pergunta);
    return {
      tipo: "reencaixar",
      pedido: { encaixarId: escolhida.id, data: ctx.data, permitirTroca: eCentral(ctx.ator) },
      chave: "assistente.reencaixeEquilibrio",
      vars: { ref: escolhida.referencia },
    };
  }

  if (/(alerta|conflito|conflict|sobrelot|overlap|sobrepor)/.test(n)) {
    if (ctx.factos.length === 0) return esclarecer("assistente.alertasNenhum", pergunta, { data: ctx.data });
    return esclarecer("assistente.verAlertas" as Chave, pergunta, { n: ctx.factos.length, data: ctx.data });
  }

  if (/(quota|vaga|slot|capacidade|capacity)/.test(n)) {
    const esgotadas = ctx.factos.filter((facto) => facto.tipo === "quota_esgotada");
    if (esgotadas.length === 0) return esclarecer("assistente.quotasLivres", pergunta, { margem: ctx.margem, data: ctx.data });
    const detalhe = esgotadas.map((facto) => `${facto.equipaNome}: ${facto.vagasInstalacao}/${facto.vagasManutencao}`).join("; ");
    return esclarecer("assistente.quotas", pergunta, { margem: ctx.margem, detalhe });
  }

  if (/(margem|buffer|desloc)/.test(n)) return esclarecer("assistente.margem", pergunta, { n: ctx.margem });

  if (/(onde esta|where is|estado da|status of)/.test(n) || (ref && n.trim() === ref.toLowerCase())) {
    if (!ordem) return esclarecer("assistente.ordemFora", pergunta, { ref: ref ?? "" });
    if (!ordem.equipaNome) return esclarecer("assistente.ordemSemEquipa", pergunta, { ref: ordem.referencia, estado: ordem.estado });
    return esclarecer("assistente.ordemEstado", pergunta, { ref: ordem.referencia, estado: ordem.estado, equipa: ordem.equipaNome });
  }

  if (/(equipa|team|tecnic)/.test(n)) {
    const linhas = ctx.equipas.map((equipa) => `${equipa.nome} ${equipa.percentagem}%`).join(", ") || "—";
    return esclarecer("assistente.equipas", pergunta, { linhas, data: ctx.data });
  }

  if (/(perfil|permiss|who am i|o que (vejo|posso)|what can i see)/.test(n)) {
    if (ctx.ator.papel === "despachante") return esclarecer("assistente.perfilDespacho", pergunta, { operadorId: ctx.ator.operadorId ?? "" });
    if (ctx.ator.papel === "tecnico") return esclarecer("assistente.perfilTecnico", pergunta);
    return esclarecer("assistente.perfilCentral", pergunta);
  }

  if (/(quantas|quantos|how many|resumo|summary|como esta o dia|how is the day)/.test(n)) {
    return esclarecer("assistente.resumoDia", pergunta, {
      data: ctx.data,
      agendadas: ctx.contagens.agendadas,
      espera: ctx.contagens.espera,
      pendentes: ctx.contagens.pendentes,
      curso: ctx.contagens.emCurso,
      margem: ctx.margem,
      alertas: ctx.factos.length,
    });
  }

  if (/(ajuda|help|o que (podes|fazes|consegues)|what can you|how do you work|como funcionas)/.test(n) || /^(ola|oi|hello|hi|bom dia|good morning)[.!]?$/.test(n)) {
    return esclarecer("assistente.ajuda", pergunta);
  }

  return { tipo: "ambiguo" };
}

export function pedidoDaFerramenta(args: Record<string, string>, ctx: ContextoRegras): PedidoRealocacao | null {
  if (ctx.ator.papel === "tecnico") return null;
  const data = /^\d{4}-\d{2}-\d{2}$/.test(args.data ?? "") ? args.data! : ctx.data;
  if (args.modo === "falta") {
    if (!eCentral(ctx.ator)) return null;
    const equipa =
      ctx.equipas.find((linha) => linha.id === args.equipaId) ??
      equipaMencionada(args.equipaId ?? "", ctx.equipas) ??
      ctx.ausencias.find((linha) => linha.total);
    if (!equipa) return null;
    return { equipaEmFalta: equipa.id, data, permitirTroca: true };
  }
  if (args.modo === "encaixar" || args.modo === "equilibrar") {
    const ordem = args.ordemId
      ? ctx.espera.find((linha) => linha.id === args.ordemId || linha.referencia.toUpperCase() === args.ordemId.toUpperCase())
      : ctx.espera[0];
    if (!ordem) return null;
    return { encaixarId: ordem.id, data, permitirTroca: args.modo === "equilibrar" && eCentral(ctx.ator) };
  }
  return null;
}
