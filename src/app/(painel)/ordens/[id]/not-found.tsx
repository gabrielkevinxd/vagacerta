import Link from "next/link";
import { i18nPedido } from "@/server/idioma";

// Ordem alheia e ordem inexistente têm a mesma resposta: não se confirma a existência de ordens de outro operador.
export default async function OrdemNaoEncontrada() {
  const { t } = await i18nPedido();
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="font-heading text-3xl">{t("ordens.naoEncontradaTitulo")}</h1>
      <p className="text-sm text-muted-foreground">{t("ordens.naoEncontradaCorpo")}</p>
      <Link href="/ordens" className="inline-block text-sm underline">
        {t("ordens.voltarLista")}
      </Link>
    </div>
  );
}
