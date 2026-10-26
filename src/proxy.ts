import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_IDIOMA, COOKIE_SESSAO, eIdioma } from "@/lib/i18n";
import { sessaoViva } from "@/server/sessao-viva";

const PUBLICAS = new Set(["/entrar", "/api/saude", "/api/sessao/entrar", "/api/sessao/sair"]);

function apagarSessao(resposta: NextResponse) {
  resposta.cookies.set(COOKIE_SESSAO, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

function sanitizarIdioma(resposta: NextResponse, pedido: NextRequest) {
  const idioma = pedido.cookies.get(COOKIE_IDIOMA)?.value;
  if (idioma && !eIdioma(idioma)) {
    resposta.cookies.set(COOKIE_IDIOMA, "", { sameSite: "lax", path: "/", maxAge: 0 });
  }
}

function seguir(pedido: NextRequest) {
  const cabecalhos = new Headers(pedido.headers);
  cabecalhos.set("x-caminho", pedido.nextUrl.pathname);
  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  sanitizarIdioma(resposta, pedido);
  return resposta;
}

function mandarEntrar(pedido: NextRequest, limparSessao: boolean) {
  const resposta = NextResponse.redirect(new URL("/entrar", pedido.url));
  if (limparSessao) apagarSessao(resposta);
  sanitizarIdioma(resposta, pedido);
  return resposta;
}

export function proxy(pedido: NextRequest) {
  const caminho = pedido.nextUrl.pathname;
  if (caminho.startsWith("/_next/") || caminho === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = pedido.cookies.get(COOKIE_SESSAO)?.value;
  const viva = token ? sessaoViva(token) : false;

  if (caminho.startsWith("/api/")) {
    if (token && !viva && caminho !== "/api/sessao/entrar") {
      const resposta = NextResponse.next();
      apagarSessao(resposta);
      sanitizarIdioma(resposta, pedido);
      return resposta;
    }
    return NextResponse.next();
  }

  if (token && !viva) {
    if (PUBLICAS.has(caminho)) {
      const resposta = seguir(pedido);
      apagarSessao(resposta);
      return resposta;
    }
    return mandarEntrar(pedido, true);
  }

  if (!viva && !PUBLICAS.has(caminho)) {
    return mandarEntrar(pedido, false);
  }

  if (viva && caminho === "/entrar") {
    const resposta = NextResponse.redirect(new URL("/", pedido.url));
    sanitizarIdioma(resposta, pedido);
    return resposta;
  }

  return seguir(pedido);
}
