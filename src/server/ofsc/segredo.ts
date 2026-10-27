import "server-only";

import { NextResponse } from "next/server";

/** Valor de demonstração; em produção defina `OFSC_WEBHOOK_SECRET`. */
export const OFSC_SEGREDO_DEMO = "vagacerta-demo-ofsc";

export function segredoOfsc(): string {
  const env = process.env.OFSC_WEBHOOK_SECRET?.trim();
  return env && env.length > 0 ? env : OFSC_SEGREDO_DEMO;
}

/** Cabeçalho `x-vagacerta-ofsc-secret` (ou Bearer) com o segredo partilhado. */
export function respostaSeSegredoOfscInvalido(pedido: Request): NextResponse | null {
  const esperado = segredoOfsc();
  const header =
    pedido.headers.get("x-vagacerta-ofsc-secret") ??
    pedido.headers.get("x-ofsc-secret") ??
    "";
  const auth = pedido.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (header === esperado || bearer === esperado) return null;
  return NextResponse.json(
    { codigo: "NAO_AUTENTICADO", mensagem: "Segredo OFSC em falta ou inválido." },
    { status: 401 },
  );
}
