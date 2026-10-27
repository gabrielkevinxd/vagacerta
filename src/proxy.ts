import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_IDIOMA, COOKIE_SESSAO, eIdioma, IDIOMA_OMISSAO } from "@/lib/i18n";
import { eCentral } from "@/lib/rules/permissoes";
import { paginaNegada, type TipoNegado } from "@/server/pagina-negada";
import { atorDaSessao, equipaVisivel, ordemLegivel } from "@/server/sessao-viva";

const PUBLICAS = new Set(["/entrar", "/api/saude", "/api/sessao/entrar", "/api/sessao/sair"]);

// Páginas com um identificador no caminho. O estado HTTP só se escolhe antes de a página começar a ser
// enviada (depois de o Next iniciar o stream fica 200), por isso a decisão de acesso é tomada aqui.
const PAGINA_ORDEM = /^\/ordens\/([^/]+)\/?$/;
const PAGINA_EQUIPA = /^\/equipas\/([^/]+)\/?$/;

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

/** Responde já, com o estado HTTP verdadeiro (404 ou 403) e a página de acesso negado no idioma do utilizador. */
function negar(pedido: NextRequest, tipo: TipoNegado, estado: 403 | 404) {
  const idioma = pedido.cookies.get(COOKIE_IDIOMA)?.value;
  const resposta = new NextResponse(paginaNegada(tipo, eIdioma(idioma) ? idioma : IDIOMA_OMISSAO), {
    status: estado,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
  sanitizarIdioma(resposta, pedido);
  return resposta;
}

function mandarEntrar(pedido: NextRequest, limparSessao: boolean) {
  const resposta = NextResponse.redirect(new URL("/entrar", pedido.url));
  if (limparSessao) apagarSessao(resposta);
  sanitizarIdioma(resposta, pedido);
  return resposta;
}

function identificador(correspondencia: RegExpExecArray | null): string | null {
  const bruto = correspondencia?.[1];
  if (!bruto) return null;
  try {
    return decodeURIComponent(bruto);
  } catch {
    return bruto;
  }
}

export function proxy(pedido: NextRequest) {
  const caminho = pedido.nextUrl.pathname;
  if (caminho.startsWith("/_next/") || caminho === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = pedido.cookies.get(COOKIE_SESSAO)?.value;
  const ator = token ? atorDaSessao(token) : null;
  const viva = ator !== null;

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

  if (ator) {
    // B4: uma ordem alheia e uma ordem inexistente dão a mesma página «não encontrada», com 404.
    const ordem = identificador(PAGINA_ORDEM.exec(caminho));
    if (ordem && ordem !== "nova" && !ordemLegivel(ator, ordem)) return negar(pedido, "ordem", 404);
    const equipa = identificador(PAGINA_EQUIPA.exec(caminho));
    if (equipa && !equipaVisivel(ator, equipa)) return negar(pedido, "equipa", 404);
    // B2: a consola de integração é só da central.
    if ((caminho === "/integracao" || caminho.startsWith("/integracao/")) && !eCentral(ator)) {
      return negar(pedido, "integracao", 403);
    }
  }

  return seguir(pedido);
}
