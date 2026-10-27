"use client";

import { useT } from "@/components/idioma/provedor";
import { COR_OPERADOR, type EstadoOrdem, type OperadorId } from "@/lib/rules";
import { cn } from "@/lib/utils";

const FUNDO_OPERADOR: Record<OperadorId, string> = {
  azul: "bg-[color:var(--op-azul-soft)] text-[color:var(--op-azul)]",
  vermelho: "bg-[color:var(--op-vermelho-soft)] text-[color:var(--op-vermelho)]",
  verde: "bg-[color:var(--op-verde-soft)] text-[color:var(--op-verde)]",
};

const ESTILO_ESTADO: Record<EstadoOrdem, string> = {
  pendente: "border-border bg-secondary text-muted-foreground",
  agendada: "border-transparent bg-accent text-accent-foreground",
  em_curso: "border-transparent bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
  concluida: "border-transparent bg-[color:var(--success-soft)] text-[color:var(--success)]",
  cancelada: "border-border bg-secondary text-muted-foreground line-through",
  em_espera: "border-border bg-background text-foreground",
};

export function EtiquetaOperador({ id, nome, soPonto = false }: { id: OperadorId; nome?: string; soPonto?: boolean }) {
  const { t } = useT();
  const rotulo = nome ?? t(`operador.${id}`);
  if (soPonto) {
    return (
      <span className="inline-flex size-2 shrink-0 rounded-full" style={{ backgroundColor: COR_OPERADOR[id] }} title={rotulo} aria-label={rotulo} />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-md px-1.5 text-[11px]/4 font-medium",
        FUNDO_OPERADOR[id],
      )}
      title={rotulo}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: COR_OPERADOR[id] }} aria-hidden />
      {rotulo}
    </span>
  );
}

export function EtiquetaEstado({ estado }: { estado: EstadoOrdem }) {
  const { t } = useT();
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-[11px]/4 font-medium",
        ESTILO_ESTADO[estado],
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
      {t(`estado.${estado}`)}
    </span>
  );
}

export function BarraOperador({ id }: { id: OperadorId }) {
  return <span className="absolute top-0 bottom-0 left-0 w-[3px] rounded-l-md" style={{ backgroundColor: COR_OPERADOR[id] }} aria-hidden />;
}
