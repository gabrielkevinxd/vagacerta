import "server-only";

import type { OperadorOfsc } from "@/lib/ofsc/tipos";
import {
  apagarAusencia,
  apagarRetry,
  criarAusencia,
  definirOfscEmBaixo,
  enfileirarRetry,
  incrementarRetry,
  listarRetries,
  ofscEmBaixo,
  patchAtividade,
  patchAusencia,
  registarLog,
  type ColunaConsola,
} from "./loja";

export function aplicarChamadaOfsc(
  operadorId: OperadorOfsc,
  metodo: string,
  caminho: string,
  corpo: Record<string, unknown> | undefined,
): { codigo: number; corpo: unknown } {
  const partes = caminho.split("/").filter(Boolean);
  if (metodo === "PATCH" && partes[0] === "activities" && partes[1]) {
    const resultado = patchAtividade(operadorId, partes[1], (corpo?.resourceId as string | null | undefined) ?? null);
    if (!resultado.ok) return { codigo: resultado.codigo, corpo: { mensagem: resultado.mensagem } };
    return { codigo: 200, corpo: resultado };
  }
  if (metodo === "POST" && partes[0] === "resources" && partes[2] === "absences") {
    const criado = criarAusencia(operadorId, partes[1]!, {
      date: String(corpo?.date ?? ""),
      startTime: String(corpo?.startTime ?? "00:00"),
      endTime: String(corpo?.endTime ?? "23:59"),
      name: String(corpo?.name ?? "DST Telecom"),
      activityId: (corpo?.activityId as string | undefined) ?? null,
    });
    return { codigo: 201, corpo: criado };
  }
  if (metodo === "PATCH" && partes[0] === "resources" && partes[2] === "absences" && partes[3]) {
    const resultado = patchAusencia(operadorId, partes[1]!, partes[3], {
      date: corpo?.date as string | undefined,
      startTime: corpo?.startTime as string | undefined,
      endTime: corpo?.endTime as string | undefined,
      name: corpo?.name as string | undefined,
    });
    if (!resultado.ok) return { codigo: resultado.codigo, corpo: { mensagem: resultado.mensagem } };
    return { codigo: 200, corpo: resultado };
  }
  if (metodo === "DELETE" && partes[0] === "resources" && partes[2] === "absences" && partes[3]) {
    const resultado = apagarAusencia(operadorId, partes[1]!, partes[3]);
    if (!resultado.ok) return { codigo: resultado.codigo, corpo: { mensagem: resultado.mensagem } };
    return { codigo: 200, corpo: resultado };
  }
  return { codigo: 404, corpo: { mensagem: "OFSC route not in contract" } };
}

export function chamarOfsc(
  origem: OperadorOfsc,
  destino: OperadorOfsc,
  metodo: string,
  caminho: string,
  corpo: Record<string, unknown> | undefined,
  historia: string,
): { ok: boolean; codigo: number; corpo: unknown; emFila?: boolean } {
  const coluna: ColunaConsola = destino === origem ? "origem" : "outros";
  const caminhoHttp = `/api/ofsc/${destino}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
  if (ofscEmBaixo(destino)) {
    enfileirarRetry(destino, metodo, caminho, corpo ?? {}, "OFSC em baixo");
    registarLog(coluna, `${historia} — OFSC do Operador ${rotulo(destino)} em baixo; ficou na fila.`, {
      metodo,
      caminho: caminhoHttp,
      pedido: corpo,
      resposta: { codigo: "OFSC_EM_BAIXO" },
      codigo: 503,
      operadorId: destino,
    });
    return { ok: false, codigo: 503, corpo: { codigo: "OFSC_EM_BAIXO" }, emFila: true };
  }
  const resultado = aplicarChamadaOfsc(destino, metodo, caminho, corpo);
  registarLog(coluna, historia, {
    metodo,
    caminho: caminhoHttp,
    pedido: corpo,
    resposta: resultado.corpo,
    codigo: resultado.codigo,
    operadorId: destino,
  });
  return { ok: resultado.codigo < 400, codigo: resultado.codigo, corpo: resultado.corpo };
}

export function reconciliarOfsc(): { reprocessados: number; falhas: number } {
  let reprocessados = 0;
  let falhas = 0;
  for (const item of listarRetries()) {
    if (ofscEmBaixo(item.operador_id)) {
      falhas += 1;
      continue;
    }
    const resultado = aplicarChamadaOfsc(item.operador_id, item.metodo, item.caminho, JSON.parse(item.corpo) as Record<string, unknown>);
    if (resultado.codigo < 400) {
      apagarRetry(item.id);
      reprocessados += 1;
      registarLog("vagacerta", `Reconciliação: ${item.metodo} ${item.caminho} no Operador ${rotulo(item.operador_id)}.`, {
        metodo: item.metodo,
        caminho: `/api/ofsc/${item.operador_id}${item.caminho.startsWith("/") ? item.caminho : `/${item.caminho}`}`,
        pedido: JSON.parse(item.corpo),
        resposta: resultado.corpo,
        codigo: resultado.codigo,
        operadorId: item.operador_id,
      });
    } else {
      incrementarRetry(item.id, JSON.stringify(resultado.corpo));
      falhas += 1;
    }
  }
  return { reprocessados, falhas };
}

export { definirOfscEmBaixo };

function rotulo(operador: OperadorOfsc): string {
  return operador === "azul" ? "Azul" : operador === "vermelho" ? "Vermelho" : "Verde";
}
