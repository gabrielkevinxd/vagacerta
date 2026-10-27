import Link from "next/link";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { i18nPedido } from "@/server/idioma";

export default async function EquipaNaoEncontrada() {
  const { t } = await i18nPedido();
  return (
    <div className="max-w-lg space-y-3">
      <CabecalhoPagina titulo={t("equipas.naoEncontradaTitulo")} descricao={t("equipas.naoEncontradaCorpo")} />
      <Link href="/equipas" className="inline-block text-sm text-primary underline underline-offset-3">
        {t("equipas.voltarLista")}
      </Link>
    </div>
  );
}
