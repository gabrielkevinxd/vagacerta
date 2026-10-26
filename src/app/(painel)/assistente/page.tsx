import { Suspense } from "react";
import { Carregamento } from "@/components/carregamento";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Superficie } from "@/components/layout/superficie";
import { i18nPedido } from "@/server/idioma";

async function Conteudo() {
  const { t } = await i18nPedido();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina titulo={t("assistente.titulo")} descricao={t("assistente.corpo")} />
      <Superficie className="space-y-3 p-4">
        <p className="text-[13px]/5 text-muted-foreground">
          {t("assistente.contrato", {
            ficheiro: "src/lib/contratos/assistente.ts",
            rota: "POST /api/assistente",
            otimizar: "POST /api/otimizar",
          })}
        </p>
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
