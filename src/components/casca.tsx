import { headers } from "next/headers";
import { Suspense } from "react";
import Link from "next/link";
import { SeletorIdioma } from "@/components/idioma/seletor";
import type { Chave } from "@/lib/i18n";
import { eCentral, type Ator } from "@/lib/rules";
import { i18nPedido } from "@/server/idioma";
import { baseDados } from "@/server/db";
import { exigirAtorPagina } from "@/server/sessao";
import { BotaoSair } from "./botao-sair";
import { Carregamento } from "./carregamento";
import { ComandoPalette } from "./comando-palette";
import { Navegacao } from "./navegacao";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

async function Sessao({ children }: { children: React.ReactNode }) {
  const ator = await exigirAtorPagina();
  const caminho = (await headers()).get("x-caminho") ?? "";
  const { t } = await i18nPedido();
  const grupos = gruposDe(ator, t);
  const destinos = grupos.flatMap((g) => g.itens.map((i) => ({ href: i.href, rotulo: chaveDeHref(i.href), icone: i.icone })));
  const migalhas = migalhasDe(caminho, t);

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
      <SidebarProvider>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
        >
          {t("marca.saltar")}
        </a>
        <Navegacao grupos={grupos} caminho={caminho} marca={t("marca.nome")} rodape={rodape} />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
            <SidebarTrigger className="size-8" />
            <Breadcrumb className="hidden min-w-0 flex-1 sm:block">
              <BreadcrumbList className="text-[13px]/5">
                {migalhas.map((miga, indice) => (
                  <span key={miga.href} className="contents">
                    {indice > 0 ? <BreadcrumbSeparator /> : null}
                    <BreadcrumbItem>
                      {indice === migalhas.length - 1 ? (
                        <BreadcrumbPage className="font-medium">{miga.rotulo}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={miga.href}>{miga.rotulo}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
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
    </TooltipProvider>
  );
}

function chaveDeHref(href: string): Chave {
  if (href === "/") return "nav.painel";
  if (href.startsWith("/ordens")) return "nav.ordens";
  if (href.startsWith("/equipas")) return "nav.equipas";
  if (href.startsWith("/agenda")) return "nav.agenda";
  if (href.startsWith("/otimizador")) return "nav.reencaixe";
  if (href.startsWith("/assistente")) return "nav.assistente";
  if (href.startsWith("/integracao")) return "nav.integracao";
  if (href.startsWith("/gemeo")) return "nav.gemeo";
  if (href.startsWith("/definicoes")) return "nav.definicoes";
  return "nav.painel";
}

function rotuloEntidade(acc: string, segmento: string): string {
  if (acc.startsWith("/ordens/") && segmento !== "nova") {
    const linha = baseDados().prepare("SELECT referencia FROM ordens WHERE id = ?").get(segmento) as
      | { referencia: string }
      | undefined;
    if (linha?.referencia) return linha.referencia;
  }
  if (acc.startsWith("/equipas/")) {
    const linha = baseDados().prepare("SELECT nome FROM equipas WHERE id = ?").get(segmento) as
      | { nome: string }
      | undefined;
    if (linha?.nome) return linha.nome;
  }
  return segmento.toUpperCase();
}

function migalhasDe(caminho: string, traduzir: (chave: Chave) => string) {
  const partes = [{ href: "/", rotulo: traduzir("nav.painel") }];
  if (caminho === "/" || caminho === "") {
    return [{ href: "/", rotulo: traduzir("nav.painel") }];
  }
  const segmentos = caminho.split("/").filter(Boolean);
  let acc = "";
  for (const segmento of segmentos) {
    acc += `/${segmento}`;
    if (segmento === "nova") {
      partes.push({ href: acc, rotulo: traduzir("painel.novaOrdem") });
    } else if (["ordens", "equipas", "agenda", "otimizador", "assistente", "integracao", "gemeo", "definicoes"].includes(segmento)) {
      partes.push({ href: acc, rotulo: traduzir(chaveDeHref(acc)) });
    } else {
      partes.push({ href: acc, rotulo: rotuloEntidade(acc, segmento) });
    }
  }
  return partes;
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
  if (central.length) grupos.push({ id: "central", rotulo: traduzir("nav.grupoCentral"), itens: central });
  return grupos;
}

export function Casca({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Sessao>{children}</Sessao>
    </Suspense>
  );
}
