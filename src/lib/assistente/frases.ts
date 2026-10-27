import type { AlertaAssistente, TipoAlerta } from "@/lib/contratos/assistente";
import { t, type Chave, type Mensagens } from "@/lib/i18n";
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

function rotuloEstado(m: Mensagens, estado: string): string {
  switch (estado) {
    case "pendente":
    case "agendada":
    case "em_curso":
    case "concluida":
    case "cancelada":
    case "em_espera":
      return t(m, `estado.${estado}`);
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

function varsProntos(m: Mensagens, vars: Record<string, string | number>): Record<string, string | number> {
  const saida: Record<string, string | number> = { ...vars };
  const operador = saida.operadorId;
  if (operador === "azul" || operador === "vermelho" || operador === "verde") {
    saida.operador = t(m, `operador.${operador}`);
  }
  if (typeof saida.estado === "string") saida.estadoRotulo = rotuloEstado(m, saida.estado);
  if (typeof saida.motivo === "string") saida.motivo = motivoLegivel(m, saida.motivo);
  return saida;
}

export function textoDe(m: Mensagens, leitura: Exclude<Leitura, { tipo: "ambiguo" }>, alertas: AlertaAssistente[] = []): string {
  const vars = varsProntos(m, "vars" in leitura ? leitura.vars : {});
  const chave: Chave = leitura.chave;
  let base = t(m, chave, vars);
  if (chave === "assistente.verAlertas") {
    const linhas = alertas
      .slice(0, 5)
      .map((alerta) => `${alerta.titulo}: ${alerta.detalhe}`)
      .join(" ");
    if (linhas) base = `${base} ${linhas}`;
  }
  return base;
}
