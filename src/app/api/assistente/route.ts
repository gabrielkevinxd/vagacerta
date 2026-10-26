import { NextResponse } from "next/server";
import { t } from "@/lib/i18n";
import { naoImplementado } from "@/server/http";
import { i18nPedido } from "@/server/idioma";
import { obterAtor } from "@/server/sessao";

export async function GET() {
  return exigir();
}

export async function POST() {
  return exigir();
}

async function exigir() {
  const { m } = await i18nPedido();
  const ator = await obterAtor();
  if (!ator) {
    return NextResponse.json({ codigo: "NAO_AUTENTICADO", mensagem: t(m, "erros.NAO_AUTENTICADO") }, { status: 401 });
  }
  return naoImplementado("src/lib/contratos/assistente.ts", t(m, "assistente.corpo"));
}
