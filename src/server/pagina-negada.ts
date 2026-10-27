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
    corpo: t(m, "integracao.soCentral"),
    voltar: t(m, "integracao.voltarPainel"),
    destino: "/",
  };
}

export function paginaNegada(tipo: TipoNegado, idioma: Idioma): string {
  const m = mensagensDe(idioma);
  const { titulo, corpo, voltar, destino } = textosDe(tipo, idioma);
  return `<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapar(titulo)} · ${escapar(t(m, "marca.nome"))}</title>
<style>
:root{--fundo:oklch(0.972 0.012 85);--texto:oklch(0.24 0.02 55);--cartao:oklch(0.995 0.004 90);--borda:oklch(0.88 0.016 80);--suave:oklch(0.48 0.02 60);--primaria:oklch(0.42 0.07 196)}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:var(--fundo);color:var(--texto);font-family:"Source Sans 3",system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}
header{background:var(--cartao);border-bottom:1px solid var(--borda)}
header div{max-width:72rem;margin:0 auto;padding:1rem}
.marca{display:block;font-family:Fraunces,Georgia,"Times New Roman",serif;font-size:1.5rem;line-height:1}
.slogan{display:block;margin-top:.25rem;color:var(--suave);font-size:.875rem}
main{max-width:72rem;margin:0 auto;padding:1.5rem 1rem}
section{max-width:32rem}
h1{margin:0 0 .75rem;font-family:Fraunces,Georgia,"Times New Roman",serif;font-size:1.875rem;line-height:1.2;font-weight:600}
p{margin:0 0 1rem;color:var(--suave);font-size:.95rem}
a{color:var(--primaria);text-underline-offset:3px}
a:focus-visible{outline:3px solid var(--primaria);outline-offset:3px;border-radius:2px}
</style>
</head>
<body>
<header><div><span class="marca">${escapar(t(m, "marca.nome"))}</span><span class="slogan">${escapar(t(m, "marca.slogan"))}</span></div></header>
<main id="conteudo"><section><h1>${escapar(titulo)}</h1><p>${escapar(corpo)}</p><a href="${destino}">${escapar(voltar)}</a></section></main>
</body>
</html>
`;
}
