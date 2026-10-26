import { headers } from "next/headers";
import { Suspense } from "react";
import { SeletorIdioma } from "@/components/idioma/seletor";
import type { Chave } from "@/lib/i18n";
import { eCentral, type Ator } from "@/lib/rules";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { BotaoSair } from "./botao-sair";
import { Carregamento } from "./carregamento";
import { Navegacao } from "./navegacao";

async function Sessao({ children }: { children: React.ReactNode }) {
  const ator = await exigirAtorPagina();
  const caminho = (await headers()).get("x-caminho") ?? "";
  const { t } = await i18nPedido();
  const itens = itensDe(ator, t);
  return (
    <div className="min-h-full">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-card focus:p-2">
        {t("marca.saltar")}
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-heading text-2xl leading-none">{t("marca.nome")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("marca.slogan")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SeletorIdioma />
            <p className="text-right text-sm">
              <span className="block font-medium">{ator.nome}</span>
              <span className="text-muted-foreground">{t(`papel.${ator.papel}`)}</span>
            </p>
            <BotaoSair />
          </div>
        </div>
      </header>
      <Navegacao itens={itens} caminho={caminho} menu={t("nav.menu")} seccoes={t("nav.seccoes")} />
      <main
        id="conteudo"
        className={`mx-auto px-4 py-6 ${caminho.startsWith("/agenda") || caminho.startsWith("/integracao") ? "max-w-[96rem]" : "max-w-6xl"}`}
      >
        <Suspense fallback={<Carregamento texto={t("carregar.seccao")} />}>{children}</Suspense>
      </main>
    </div>
  );
}

function itensDe(ator: Ator, traduzir: (chave: Chave) => string) {
  const itens = [
    { href: "/", rotulo: traduzir("nav.painel") },
    { href: "/ordens", rotulo: traduzir("nav.ordens") },
    { href: "/equipas", rotulo: traduzir("nav.equipas") },
  ];
  if (ator.papel !== "tecnico") itens.push({ href: "/otimizador", rotulo: traduzir("nav.reencaixe") });
  itens.push({ href: "/agenda", rotulo: traduzir("nav.agenda") });
  if (ator.papel !== "tecnico") {
    itens.push({ href: "/assistente", rotulo: traduzir("nav.assistente") });
    itens.push({ href: "/integracao", rotulo: traduzir("nav.integracao") });
  }
  if (eCentral(ator)) {
    itens.push({ href: "/gemeo", rotulo: traduzir("nav.gemeo") }, { href: "/definicoes", rotulo: traduzir("nav.definicoes") });
  }
  return itens;
}

export function Casca({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Sessao>{children}</Sessao>
    </Suspense>
  );
}
