import type { AlertaAssistente, TipoAlerta } from "@/lib/contratos/assistente";
import { eBasePlural, idiomaDe, t, tp, type ChaveLeitura, type Mensagens } from "@/lib/i18n";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import type { FactoAlerta } from "./analise";
import type { Leitura } from "./regras";

function titulo(m: Mensagens, tipo: TipoAlerta): string {
  switch (tipo) {
    case "sobrelotacao":
      return t(m, "assistente.tipos.sobrelotacao");
    case "quota_esgotada":
      return t(m, "assistente.tipos.quota_esgotada");
    case "tecnico_ausente":
      return t(m, "assistente.tipos.tecnico_ausente");
    case "sem_tecnico":
      return t(m, "assistente.tipos.sem_tecnico");
    case "sobreposicao":
      return t(m, "assistente.tipos.sobreposicao");
  }
}

function detalhe(m: Mensagens, facto: FactoAlerta): string {
  const equipa = facto.equipaNome ?? "";
  const ref = facto.referencia ?? "";
  if (facto.tipo === "sobrelotacao") {
    return t(m, "assistente.factos.sobrelotacao", {
      equipa,
      percentagem: facto.percentagem ?? 0,
      minutos: facto.minutos ?? 0,
    });
  }
  if (facto.tipo === "quota_esgotada") {
    return t(m, "assistente.factos.quota", {
      equipa,
      inst: facto.vagasInstalacao ?? 0,
      man: facto.vagasManutencao ?? 0,
    });
  }
  if (facto.tipo === "tecnico_ausente") {
    const motivo = motivoLegivel(m, facto.motivo ?? "");
    return t(m, facto.total ? "assistente.factos.ausenciaTotal" : "assistente.factos.ausencia", { equipa, motivo });
  }
  if (facto.tipo === "sem_tecnico") {
    return t(m, "assistente.factos.semTecnico", { ref, estado: rotuloEstado(m, facto.estado ?? "") });
  }
  if (facto.oculta) {
    return t(m, "assistente.factos.sobreposicaoOculta", { ref, equipa });
  }
  if (facto.motivo === "margem") {
    return t(m, "assistente.factos.sobreposicaoMargem", { ref, equipa, minutos: facto.minutos ?? 0 });
  }
  return t(m, "assistente.factos.sobreposicao", { ref, equipa });
}

export function motivoLegivel(m: Mensagens, motivo: string): string {
  if (motivo === "sem_tecnicos") return t(m, "assistente.motivoSemTecnicos");
  if (motivo === "inativa") return t(m, "assistente.motivoInativa");
  return motivo;
}

/** Rótulo de estado em minúsculas para texto corrido («está em fila», não «está Em fila»). */
function rotuloEstado(m: Mensagens, estado: string): string {
  const idioma = idiomaDe(m);
  switch (estado) {
    case "pendente":
    case "agendada":
    case "em_curso":
    case "concluida":
    case "cancelada":
    case "em_espera":
      return t(m, `estado.${estado}`).toLocaleLowerCase(idioma === "en" ? "en-GB" : "pt-PT");
    default:
      return estado;
  }
}

export function descreverAlertas(m: Mensagens, factos: FactoAlerta[]): AlertaAssistente[] {
  return factos.map((facto) => {
    const texto = detalhe(m, facto);
    const extra = facto.pedido ? ` ${t(m, "assistente.podePrever")}` : "";
    return {
      id: `${facto.tipo}:${facto.data}:${facto.equipaId ?? ""}:${facto.ordemId ?? ""}:${facto.motivo ?? ""}:${facto.referencia ?? ""}`,
      tipo: facto.tipo,
      gravidade: facto.gravidade,
      titulo: titulo(m, facto.tipo),
      detalhe: `${texto}${extra}`.trim(),
      data: facto.data,
      pedido: facto.pedido ?? null,
    };
  });
}

function dataLegivel(m: Mensagens, data: string | number | undefined): string {
  const valor = String(data ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return formatarDataLocale(valor, idiomaDe(m));
  return valor;
}

export function montarResumoDia(
  m: Mensagens,
  entrada: {
    data: string;
    agendadas: number;
    espera: number;
    pendentes: number;
    curso: number;
    margem: number;
    alertas: number;
  },
): string {
  return t(m, "assistente.resumoDia", {
    data: dataLegivel(m, entrada.data),
    agendadas: tp(m, "assistente.contagem.agendadas", entrada.agendadas),
    espera: tp(m, "assistente.contagem.espera", entrada.espera),
    pendentes: tp(m, "assistente.contagem.pendentes", entrada.pendentes),
    curso: tp(m, "assistente.contagem.curso", entrada.curso),
    margem: entrada.margem,
    alertas: tp(m, "assistente.contagem.alertas", entrada.alertas),
  });
}

function varsProntos(m: Mensagens, vars: Record<string, string | number>): Record<string, string | number> {
  const saida: Record<string, string | number> = { ...vars };
  const operador = saida.operadorId;
  if (operador === "azul" || operador === "vermelho" || operador === "verde") {
    saida.operador = t(m, `operador.${operador}`);
  }
  if (typeof saida.estado === "string") saida.estadoRotulo = rotuloEstado(m, saida.estado);
  if (typeof saida.motivo === "string") saida.motivo = motivoLegivel(m, saida.motivo);
  if (typeof saida.data === "string" || typeof saida.data === "number") {
    saida.data = dataLegivel(m, saida.data);
  }
  return saida;
}

export function textoDe(m: Mensagens, leitura: Exclude<Leitura, { tipo: "ambiguo" }>, alertas: AlertaAssistente[] = []): string {
  const vars = varsProntos(m, "vars" in leitura ? leitura.vars : {});
  const chave: ChaveLeitura = leitura.chave;

  if (chave === "assistente.resumoDia") {
    return montarResumoDia(m, {
      data: String(vars.data ?? ""),
      agendadas: Number(vars.agendadas ?? 0),
      espera: Number(vars.espera ?? 0),
      pendentes: Number(vars.pendentes ?? 0),
      curso: Number(vars.curso ?? 0),
      margem: Number(vars.margem ?? 0),
      alertas: Number(vars.alertas ?? 0),
    });
  }

  let base: string;
  if (eBasePlural(chave)) {
    base = tp(m, chave, Number(vars.n ?? 0), vars);
  } else {
    base = t(m, chave, vars);
  }

  if (chave === "assistente.verAlertas") {
    const linhas = alertas
      .slice(0, 5)
      .map((alerta) => `${alerta.titulo}: ${alerta.detalhe}`)
      .join(" ");
    if (linhas) base = `${base} ${linhas}`;
  }
  return base;
}
