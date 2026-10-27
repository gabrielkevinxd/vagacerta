import Link from "next/link";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { i18nPedido } from "@/server/idioma";

// Ordem alheia e ordem inexistente têm a mesma resposta: não se confirma a existência de ordens de outro operador.
export default async function OrdemNaoEncontrada() {
  const { t } = await i18nPedido();
  return (
    <div className="max-w-lg space-y-3">
      <CabecalhoPagina titulo={t("ordens.naoEncontradaTitulo")} descricao={t("ordens.naoEncontradaCorpo")} />
      <Link href="/ordens" className="inline-block text-sm text-primary underline underline-offset-3">
        {t("ordens.voltarLista")}
      </Link>
    </div>
  );
}
