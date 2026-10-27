import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import { mensagensDe, t, type Idioma } from "@/lib/i18n";

/**
 * Páginas de acesso negado servidas pelo `proxy.ts` com o estado HTTP verdadeiro (404 ou 403).
 *
 * As páginas da aplicação só começam a ser enviadas depois de o Next fixar o estado 200 (a casca estática vai
 * primeiro e o conteúdo dinâmico chega por stream), por isso uma ordem alheia, uma equipa alheia ou a consola
 * de integração sem perfil não conseguem dar 404/403 a partir da página. O proxy corre antes de tudo: responde
 * aqui, com HTML autónomo (sem JavaScript) e as mesmas mensagens PT-PT/EN da aplicação.
 *
 * Só entram textos do catálogo de mensagens (nunca valores do pedido), por isso não há nada a escapar do utilizador.
 */
export type TipoNegado = "ordem" | "equipa" | "integracao";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapar = (texto: string) => texto.replace(/[&<>"']/g, (caractere) => ESCAPES[caractere] ?? caractere);

/** Tokens do design system (módulo partilhado — sem ler `src/` em runtime). */
export function tokensDeGlobals(): Record<string, string> {
  return { ...DESIGN_TOKENS };
}

let cacheFonteInter: string | null = null;

/**
 * Inclui o `@font-face` da Inter gerado pelo `next/font`, com URLs absolutas em `/_next/...`.
 * Procura pelo conteúdo (`font-family: Inter`), não pelo nome do ficheiro (hashes do build).
 */
export function cssFonteInter(raiz = process.cwd()): string {
  if (cacheFonteInter !== null) return cacheFonteInter;
  const pastas = [
    { chunks: join(raiz, ".next/static/chunks"), media: "/_next/static/media" },
    { chunks: join(raiz, ".next/dev/static/chunks"), media: "/_next/dev/static/media" },
  ];
  for (const pasta of pastas) {
    if (!existsSync(pasta.chunks)) continue;
    let ficheiros: string[] = [];
    try {
      ficheiros = readdirSync(pasta.chunks).filter((nome) => nome.endsWith(".css"));
    } catch {
      continue;
    }
    for (const nome of ficheiros) {
      try {
        const bruto = readFileSync(join(pasta.chunks, nome), "utf8");
        if (!/font-family:\s*Inter\b/.test(bruto)) continue;
        const faces = [...bruto.matchAll(/@font-face\{[^}]+\}/g), ...bruto.matchAll(/@font-face\s*\{[^}]+\}/g)].map(
          (m) => m[0],
        );
        const soInter = faces.filter((face) => /font-family:\s*Inter\b/.test(face) && !/Inter Fallback/.test(face));
        if (!soInter.length) continue;
        cacheFonteInter = soInter
          .map((face) =>
            face
              .replace(/url\((?:\.\.\/)+media\/([^)]+)\)/g, `url("${pasta.media}/$1")`)
              .replace(/url\("(?:\.\.\/)+media\/([^"]+)"\)/g, `url("${pasta.media}/$1")`)
              .replace(/url\('(?:\.\.\/)+media\/([^']+)'\)/g, `url('${pasta.media}/$1')`),
          )
          .join("\n");
        return cacheFonteInter;
      } catch {
        continue;
      }
    }
  }
  cacheFonteInter = "";
  return cacheFonteInter;
}

/** Só para testes: limpa a cache da fonte. */
export function _resetCacheFonteInter(): void {
  cacheFonteInter = null;
}

function textosDe(tipo: TipoNegado, idioma: Idioma) {
  const m = mensagensDe(idioma);
  if (tipo === "ordem") {
    return {
      titulo: t(m, "ordens.naoEncontradaTitulo"),
      corpo: t(m, "ordens.naoEncontradaCorpo"),
      voltar: t(m, "ordens.voltarLista"),
      destino: "/ordens",
    };
  }
  if (tipo === "equipa") {
    return {
      titulo: t(m, "equipas.naoEncontradaTitulo"),
      corpo: t(m, "equipas.naoEncontradaCorpo"),
      voltar: t(m, "equipas.voltarLista"),
      destino: "/equipas",
    };
  }
  return {
    titulo: t(m, "integracao.titulo"),
    // Só o técnico é bloqueado no proxy; despachante entra com scope D1 nas APIs.
    corpo: t(m, "acesso.soNaoTecnico"),
    voltar: t(m, "integracao.voltarPainel"),
    destino: "/",
  };
}

export function paginaNegada(tipo: TipoNegado, idioma: Idioma): string {
  const m = mensagensDe(idioma);
  const { titulo, corpo, voltar, destino } = textosDe(tipo, idioma);
  const tokens = tokensDeGlobals();
  const fonte = cssFonteInter();
  return `<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapar(titulo)} · ${escapar(t(m, "marca.nome"))}</title>
<style>
${fonte}
:root{--background:${tokens.background};--foreground:${tokens.foreground};--muted-foreground:${tokens["muted-foreground"]};--border:${tokens.border};--primary:${tokens.primary};--ring:${tokens.ring}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:var(--background);color:var(--foreground);font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.5}
header{border-bottom:1px solid var(--border)}
header div{max-width:72rem;margin:0 auto;padding:1rem}
.marca{display:block;font-size:1rem;font-weight:600;letter-spacing:-0.02em;line-height:1.2}
main{max-width:72rem;margin:0 auto;padding:1.5rem 1rem}
section{max-width:32rem}
h1{margin:0 0 .75rem;font-size:1.25rem;line-height:1.3;font-weight:600;letter-spacing:-0.02em}
p{margin:0 0 1rem;color:var(--muted-foreground)}
a{color:var(--primary);text-underline-offset:3px}
a:focus-visible{outline:2px solid var(--ring);outline-offset:3px;border-radius:2px}
</style>
</head>
<body>
<header><div><span class="marca">${escapar(t(m, "marca.nome"))}</span></div></header>
<main id="conteudo"><section><h1>${escapar(titulo)}</h1><p>${escapar(corpo)}</p><a href="${destino}">${escapar(voltar)}</a></section></main>
</body>
</html>
`;
}
