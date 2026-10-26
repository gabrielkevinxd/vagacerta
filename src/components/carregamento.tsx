"use client";

import { useT } from "@/components/idioma/provedor";

export function Carregamento({ texto }: { texto?: string }) {
  const { t } = useT();
  return (
    <p className="px-4 py-10 text-sm text-muted-foreground" role="status">
      {texto ?? t("carregar.seccao")}
    </p>
  );
}
