"use client";

import { useT } from "@/components/idioma/provedor";
import { COR_OPERADOR, type EstadoOrdem, type OperadorId } from "@/lib/rules";

export function EtiquetaOperador({ id, nome }: { id: OperadorId; nome?: string }) {
  const { t } = useT();
  const rotulo = nome ?? t(`operador.${id}`);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: COR_OPERADOR[id] }}
      title={rotulo}
    >
      {rotulo}
    </span>
  );
}

export function EtiquetaEstado({ estado }: { estado: EstadoOrdem }) {
  const { t } = useT();
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium">
      {t(`estado.${estado}`)}
    </span>
  );
}
