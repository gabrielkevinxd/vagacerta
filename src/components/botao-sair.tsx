"use client";

import { sairAcao } from "@/app/(painel)/sair-acao";
import { useT } from "@/components/idioma/provedor";
import { Button } from "@/components/ui/button";

export function BotaoSair() {
  const { t } = useT();
  return (
    <form action={sairAcao}>
      <Button type="submit" variant="outline" size="sm">
        {t("nav.sair")}
      </Button>
    </form>
  );
}
