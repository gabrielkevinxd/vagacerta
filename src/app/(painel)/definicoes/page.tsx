import { Suspense } from "react";
import { eCentral } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { FormularioMargem } from "@/components/formulario-margem";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { margemAtual } from "@/server/servicos";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (!eCentral(ator)) {
    return (
      <div className="space-y-2">
        <h1 className="font-heading text-3xl">{t("definicoes.titulo")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("definicoes.soCentral")}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl">{t("definicoes.titulo")}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{t("definicoes.intro")}</p>
      <FormularioMargem minutos={margemAtual()} />
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
