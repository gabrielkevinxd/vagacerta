import Link from "next/link";
import { Suspense } from "react";
import { DATA_DEMONSTRACAO } from "@/lib/demonstracao";
import { JANELAS_INICIO } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { FormularioOrdem } from "@/components/formulario-ordem";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarZonas } from "@/server/servicos";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (ator.papel === "tecnico") {
    return (
      <div className="space-y-3">
        <h1 className="font-heading text-3xl">{t("ordens.novaTitulo")}</h1>
        <p>{t("ordens.tecnicoNaoCria")}</p>
        <Link href="/ordens" className="text-sm underline">
          {t("ordens.voltarLista")}
        </Link>
      </div>
    );
  }
  const zonas = listarZonas();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl">{t("ordens.novaTitulo")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("ordens.novaAjuda")}</p>
      </div>
      <FormularioOrdem
        operadorFixo={ator.papel === "despachante" ? ator.operadorId : null}
        zonas={zonas}
        janelas={JANELAS_INICIO}
        dataInicial={DATA_DEMONSTRACAO}
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
