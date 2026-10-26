import { NextResponse } from "next/server";
import { publico } from "@/server/http";
import { sair } from "@/server/sessao";

export function POST() {
  return publico(async () => {
    await sair();
    return { ok: true };
  });
}

export async function GET(pedido: Request) {
  await sair();
  return NextResponse.redirect(new URL("/entrar", pedido.url), 303);
}
