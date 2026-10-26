import { Suspense } from "react";
import { Carregamento } from "@/components/carregamento";
import { i18nPedido } from "@/server/idioma";

async function Conteudo() {
  const { t } = await i18nPedido();
  return (
    <div className="max-w-2xl space-y-3">
      <h1 className="font-heading text-3xl">{t("assistente.titulo")}</h1>
      <p>{t("assistente.corpo")}</p>
      <p className="text-sm text-muted-foreground">
        {t("assistente.contrato", {
          ficheiro: "src/lib/contratos/assistente.ts",
          rota: "POST /api/assistente",
          otimizar: "POST /api/otimizar",
        })}
      </p>
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
