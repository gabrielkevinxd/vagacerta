import { Suspense } from "react";
import { JANELAS_INICIO } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { FormularioOrdem } from "@/components/formulario-ordem";
import { SemAcesso } from "@/components/sem-acesso";
import { i18nPedido } from "@/server/idioma";
import { diaDemonstracaoAtual } from "@/server/db";
import { exigirAtorPagina } from "@/server/sessao";
import { listarZonas } from "@/server/servicos";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (ator.papel === "tecnico") {
    return (
      <SemAcesso
        tituloPagina={t("ordens.novaTitulo")}
        titulo={t("acesso.semAcesso")}
        detalhe={t("acesso.soCentralArea")}
        accao={t("acesso.voltarPainel")}
      />
    );
  }
  const zonas = listarZonas();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{t("ordens.novaTitulo")}</h1>
        <p className="mt-1 max-w-2xl text-[13px]/5 text-muted-foreground">{t("ordens.novaAjuda")}</p>
      </div>
      <FormularioOrdem
        operadorFixo={ator.papel === "despachante" ? ator.operadorId : null}
        zonas={zonas}
        janelas={JANELAS_INICIO}
        dataInicial={diaDemonstracaoAtual()}
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
