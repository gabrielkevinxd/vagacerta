import Link from "next/link";
import { i18nPedido } from "@/server/idioma";

export default async function EquipaNaoEncontrada() {
  const { t } = await i18nPedido();
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="font-heading text-3xl">{t("equipas.naoEncontradaTitulo")}</h1>
      <p className="text-sm text-muted-foreground">{t("equipas.naoEncontradaCorpo")}</p>
      <Link href="/equipas" className="inline-block text-sm underline">
        {t("equipas.voltarLista")}
      </Link>
    </div>
  );
}
