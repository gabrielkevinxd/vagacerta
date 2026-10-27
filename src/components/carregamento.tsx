"use client";

import { useT } from "@/components/idioma/provedor";
import { Skeleton } from "@/components/ui/skeleton";

export function Carregamento({ texto, variante = "painel" }: { texto?: string; variante?: "painel" | "tabela" | "agenda" }) {
  const { t } = useT();
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      {variante === "painel" ? <CarregamentoPainel /> : null}
      {variante === "tabela" ? <CarregamentoTabela /> : null}
      {variante === "agenda" ? <CarregamentoAgenda /> : null}
      <p className="sr-only">{texto ?? t("carregar.seccao")}</p>
    </div>
  );
}

function CarregamentoPainel() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-lg" />
        ))}
      </div>
      <div className="superficie overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex h-9 items-center gap-3 border-b border-border px-3 last:border-0">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </>
  );
}

function CarregamentoTabela() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="flex h-9 gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="superficie overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex h-9 items-center gap-3 border-b border-border px-3 last:border-0">
            <Skeleton className="size-4" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="ml-auto h-3 w-28" />
          </div>
        ))}
      </div>
    </>
  );
}

function CarregamentoAgenda() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="superficie space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative h-11 rounded-md bg-muted/40">
            <Skeleton className="absolute top-2 left-[10%] h-7 w-28 rounded-md" />
            <Skeleton className="absolute top-2 left-[45%] h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </>
  );
}
