"use client";

import { useT } from "@/components/idioma/provedor";

export default function ErroPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="font-heading text-2xl">{t("erroPagina.titulo")}</h1>
      <p className="text-sm">{error.message || t("erroPagina.inesperado")}</p>
      <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-sm" onClick={reset}>
        {t("comum.tentarDeNovo")}
      </button>
    </div>
  );
}
