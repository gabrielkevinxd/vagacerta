import { Suspense } from "react";
import { SeletorIdioma } from "@/components/idioma/seletor";
import type { Chave } from "@/lib/i18n";
import { eCentral, type Ator } from "@/lib/rules";
import { chaveDeHref } from "@/lib/migalhas";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { BotaoSair } from "./botao-sair";
import { Carregamento } from "./carregamento";
import { ComandoPalette } from "./comando-palette";
import { Migalhas } from "./migalhas";
import { ProvedorMigalhas } from "./migalhas-contexto";
import { Navegacao } from "./navegacao";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "./ui/sonner";

async function Sessao({ children }: { children: React.ReactNode }) {
  const ator = await exigirAtorPagina();
  const { t } = await i18nPedido();
  const grupos = gruposDe(ator, t);
  const destinos = grupos.flatMap((g) => g.itens.map((i) => ({ href: i.href, rotulo: chaveDeHref(i.href), icone: i.icone })));

  const rodape = (
    <div className="space-y-2 group-data-[collapsible=icon]:hidden">
      <div className="rounded-md px-2 py-1.5">
        <p className="truncate text-[13px]/5 font-medium leading-tight">{ator.nome}</p>
        <p className="truncate text-xs text-muted-foreground">{t(`papel.${ator.papel}`)}</p>
      </div>
      <div className="flex items-center justify-between gap-2 px-1">
        <SeletorIdioma compacto />
        <BotaoSair />
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={400}>
      <ProvedorMigalhas>
        <SidebarProvider>
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
          >
            {t("marca.saltar")}
          </a>
          <Navegacao grupos={grupos} marca={t("marca.nome")} rodape={rodape} />
          <SidebarInset className="min-w-0">
            <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
              <SidebarTrigger className="size-8" />
              <Migalhas />
              <div className="ml-auto flex items-center gap-2">
                <ComandoPalette destinos={destinos} papel={ator.papel} />
              </div>
            </header>
            <main id="conteudo" className="w-full flex-1 px-4 py-4 md:px-6 md:py-5">
              <Suspense fallback={<Carregamento texto={t("carregar.seccao")} />}>{children}</Suspense>
            </main>
          </SidebarInset>
          <Toaster position="bottom-right" richColors={false} />
        </SidebarProvider>
      </ProvedorMigalhas>
    </TooltipProvider>
  );
}

function gruposDe(ator: Ator, traduzir: (chave: Chave) => string) {
  const operacao = [
    { href: "/", rotulo: traduzir("nav.painel"), icone: "painel" },
    { href: "/agenda", rotulo: traduzir("nav.agenda"), icone: "agenda" },
    { href: "/ordens", rotulo: traduzir("nav.ordens"), icone: "ordens" },
    { href: "/equipas", rotulo: traduzir("nav.equipas"), icone: "equipas" },
  ];
  if (ator.papel !== "tecnico") {
    operacao.push({ href: "/otimizador", rotulo: traduzir("nav.reencaixe"), icone: "reencaixe" });
  }

  const central = [] as { href: string; rotulo: string; icone: string }[];
  if (ator.papel !== "tecnico") {
    central.push(
      { href: "/integracao", rotulo: traduzir("nav.integracao"), icone: "integracao" },
      { href: "/assistente", rotulo: traduzir("nav.assistente"), icone: "assistente" },
    );
  }
  if (eCentral(ator)) {
    central.push(
      { href: "/gemeo", rotulo: traduzir("nav.gemeo"), icone: "gemeo" },
      { href: "/definicoes", rotulo: traduzir("nav.definicoes"), icone: "definicoes" },
    );
  }

  const grupos = [{ id: "operacao", rotulo: traduzir("nav.grupoOperacao"), itens: operacao }];
  if (central.length) {
    // Despachante: Integração/Assistente sem o rótulo «Central» (só a central vê esse grupo).
    const soCentral = eCentral(ator);
    grupos.push({
      id: soCentral ? "central" : "ferramentas",
      rotulo: traduzir(soCentral ? "nav.grupoCentral" : "nav.grupoFerramentas"),
      itens: central,
    });
  }
  return grupos;
}

export function Casca({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Sessao>{children}</Sessao>
    </Suspense>
  );
}
