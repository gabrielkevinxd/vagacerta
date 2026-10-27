"use client";

import { useT } from "@/components/idioma/provedor";
import { Button } from "@/components/ui/button";

export default function ErroPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <div className="superficie max-w-lg space-y-3 p-6">
      <h1 className="text-xl font-semibold tracking-tight">{t("erroPagina.titulo")}</h1>
      <p className="text-[13px]/5 text-muted-foreground">{error.message || t("erroPagina.inesperado")}</p>
      <Button type="button" variant="outline" size="sm" onClick={reset}>
        {t("comum.tentarDeNovo")}
      </Button>
    </div>
  );
}
