"use client";

import { useT } from "@/components/idioma/provedor";
import { Skeleton } from "@/components/ui/skeleton";

export function Carregamento({ texto }: { texto?: string }) {
  const { t } = useT();
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="superficie space-y-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="superficie overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex h-9 items-center gap-3 border-b border-border px-3 last:border-0">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="ml-auto h-3 w-24" />
          </div>
        ))}
      </div>
      <p className="sr-only">{texto ?? t("carregar.seccao")}</p>
    </div>
  );
}
