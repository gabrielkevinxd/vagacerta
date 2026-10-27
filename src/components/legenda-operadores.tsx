"use client";

import { useT } from "@/components/idioma/provedor";
import { COR_OPERADOR } from "@/lib/rules/rotulos";
import { OPERADORES, type OperadorId } from "@/lib/rules/tipos";

export function LegendaOperadores({
  compacta = false,
  apenas = null,
}: {
  compacta?: boolean;
  /** Quando definido (ex.: despachante), só esse operador aparece. */
  apenas?: OperadorId | null;
}) {
  const { t } = useT();
  const ids = apenas ? ([apenas] as const) : OPERADORES;
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 ${compacta ? "text-xs" : "text-[13px]/5"}`} aria-label={t("operador.cores")}>
      {ids.map((id) => (
        <li key={id} className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: COR_OPERADOR[id] }} aria-hidden />
          <span>{t(`operador.${id}`)}</span>
        </li>
      ))}
    </ul>
  );
}
