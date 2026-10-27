import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Valor de demonstração (só fora de produção). Em produção defina `OFSC_WEBHOOK_SECRET`. */
export const OFSC_SEGREDO_DEMO = "vagacerta-demo-ofsc";

export function segredoOfsc(): string | null {
  const env = process.env.OFSC_WEBHOOK_SECRET?.trim();
  if (env && env.length > 0) return env;
  if (process.env.NODE_ENV === "production") return null;
  return OFSC_SEGREDO_DEMO;
}

function segredosIguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Cabeçalho `x-vagacerta-ofsc-secret` (ou Bearer) com o segredo partilhado. */
export function respostaSeSegredoOfscInvalido(pedido: Request): NextResponse | null {
  const esperado = segredoOfsc();
  if (!esperado) {
    return NextResponse.json(
      { codigo: "SERVICO_INDISPONIVEL", mensagem: "Segredo OFSC não configurado." },
      { status: 503 },
    );
  }
  const header =
    pedido.headers.get("x-vagacerta-ofsc-secret") ??
    pedido.headers.get("x-ofsc-secret") ??
    "";
  const auth = pedido.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if ((header && segredosIguais(header, esperado)) || (bearer && segredosIguais(bearer, esperado))) {
    return null;
  }
  return NextResponse.json(
    { codigo: "NAO_AUTENTICADO", mensagem: "Segredo OFSC em falta ou inválido." },
    { status: 401 },
  );
}
