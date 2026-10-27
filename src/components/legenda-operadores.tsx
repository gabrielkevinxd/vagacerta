"use client";

import { useT } from "@/components/idioma/provedor";
import { COR_OPERADOR } from "@/lib/rules/rotulos";
import { OPERADORES } from "@/lib/rules/tipos";

export function LegendaOperadores({ compacta = false }: { compacta?: boolean }) {
  const { t } = useT();
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 ${compacta ? "text-xs" : "text-[13px]/5"}`} aria-label={t("operador.cores")}>
      {OPERADORES.map((id) => (
        <li key={id} className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: COR_OPERADOR[id] }} aria-hidden />
          <span>{t(`operador.${id}`)}</span>
        </li>
      ))}
    </ul>
  );
}
