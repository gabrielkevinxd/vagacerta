import { Suspense } from "react";
import { eCentral } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { FormularioMargem } from "@/components/formulario-margem";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Superficie } from "@/components/layout/superficie";
import { SemAcesso } from "@/components/sem-acesso";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { margemAtual } from "@/server/servicos";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (!eCentral(ator)) {
    return (
      <SemAcesso
        tituloPagina={t("definicoes.titulo")}
        titulo={t("acesso.semAcesso")}
        detalhe={t("acesso.soCentralArea")}
        accao={t("acesso.voltarPainel")}
      />
    );
  }
  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo={t("definicoes.titulo")} descricao={t("definicoes.intro")} />
      <Superficie className="max-w-md p-5">
        <FormularioMargem minutos={margemAtual()} />
      </Superficie>
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
