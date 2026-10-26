"use client";

import { sairAcao } from "@/app/(painel)/sair-acao";
import { useT } from "@/components/idioma/provedor";

export function BotaoSair() {
  const { t } = useT();
  return (
    <form action={sairAcao}>
      <button
        type="submit"
        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
      >
        {t("nav.sair")}
      </button>
    </form>
  );
}
