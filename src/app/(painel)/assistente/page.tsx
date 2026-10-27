import Link from "next/link";
import { Suspense } from "react";
import { Bot } from "lucide-react";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { SemAcesso } from "@/components/sem-acesso";
import { Button } from "@/components/ui/button";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (ator.papel === "tecnico") {
    return (
      <SemAcesso
        tituloPagina={t("assistente.titulo")}
        titulo={t("acesso.semAcesso")}
        detalhe={t("acesso.soNaoTecnico")}
        accao={t("acesso.voltarPainel")}
      />
    );
  }
  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo={t("assistente.titulo")} descricao={t("assistente.corpo")} />
      <EstadoVazio
        titulo={t("assistente.emBreve")}
        detalhe={t("assistente.emBreveDetalhe")}
        icone={<Bot className="size-5 text-muted-foreground" strokeWidth={1.75} />}
        accao={
          <Button asChild size="sm">
            <Link href="/otimizador">{t("assistente.abrirReencaixe")}</Link>
          </Button>
        }
      />
    </div>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<Carregamento />}>
      <Conteudo />
    </Suspense>
  );
}
