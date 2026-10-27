import { NextResponse } from "next/server";
import { mensagensDe, t } from "@/lib/i18n";
import { publico } from "@/server/http";
import { lerIdiomaPedido } from "@/server/idioma";
import { sair } from "@/server/sessao";

export function POST() {
  return publico(async () => {
    await sair();
    return { ok: true };
  });
}

// Terminar a sessão só se faz por POST. Um GET (uma imagem, uma ligação noutra página, um prefetch)
// não pode tirar o utilizador da sessão: 405 e a sessão continua.
export async function GET() {
  const idioma = await lerIdiomaPedido();
  return NextResponse.json(
    { codigo: "METODO_NAO_PERMITIDO", mensagem: t(mensagensDe(idioma), "erros.metodoNaoPermitido") },
    { status: 405, headers: { Allow: "POST" } },
  );
}
