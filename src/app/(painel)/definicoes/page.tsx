import { Suspense } from "react";
import { eCentral } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { FormularioMargem } from "@/components/formulario-margem";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Superficie } from "@/components/layout/superficie";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { margemAtual } from "@/server/servicos";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (!eCentral(ator)) {
    return (
      <div className="space-y-6">
        <CabecalhoPagina titulo={t("definicoes.titulo")} />
        <EstadoVazio titulo={t("definicoes.titulo")} detalhe={t("definicoes.soCentral")} />
      </div>
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
