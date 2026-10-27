"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useT } from "@/components/idioma/provedor";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import type { Idioma } from "@/lib/i18n";
import type { EstadoOrdem, OperadorId } from "@/lib/rules";
import { cn } from "@/lib/utils";

export type LinhaOrdem = {
  id: string;
  referencia: string;
  clienteNome: string;
  morada: string;
  data: string;
  janelaInicio: string;
  janelaFim: string;
  equipaNome: string | null;
  operadorId: OperadorId;
  estado: EstadoOrdem;
};

const features = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

type Features = typeof features;

export function TabelaOrdens({
  ordens,
  idioma,
  ordemAberta,
  selecionavel = true,
}: {
  ordens: LinhaOrdem[];
  idioma: Idioma;
  ordemAberta?: string;
  selecionavel?: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([{ id: "janela", desc: false }]);

  const abrir = (id: string) => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    sp.set("ordem", id);
    router.push(`/ordens?${sp.toString()}`, { scroll: false });
  };

  const colunas = useMemo<ColumnDef<Features, LinhaOrdem>[]>(() => {
    const base: ColumnDef<Features, LinhaOrdem>[] = [];
    if (selecionavel) {
      base.push({
        id: "sel",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
            aria-label={t("tabela.selecionadas", { n: ordens.length })}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selecionadas.has(row.original.id) || row.getIsSelected()}
            onCheckedChange={(v) => {
              row.toggleSelected(Boolean(v));
              setSelecionadas((atual) => {
                const proximo = new Set(atual);
                if (v) proximo.add(row.original.id);
                else proximo.delete(row.original.id);
                return proximo;
              });
            }}
            aria-label={row.original.referencia}
          />
        ),
        enableSorting: false,
      });
    }
    base.push(
      {
        accessorKey: "referencia",
        id: "ref",
        header: t("tabela.ref"),
        cell: ({ row }) => (
          <button type="button" onClick={() => abrir(row.original.id)} className="font-mono text-[13px]/5 font-medium tabular-nums foco-anel">
            {row.original.referencia}
          </button>
        ),
      },
      {
        accessorKey: "clienteNome",
        id: "cliente",
        header: t("tabela.cliente"),
        cell: ({ row }) => (
          <button type="button" onClick={() => abrir(row.original.id)} className="max-w-[14rem] truncate text-left foco-anel">
            {row.original.clienteNome}
            <span className="block truncate text-xs text-muted-foreground">{row.original.morada}</span>
          </button>
        ),
      },
      {
        id: "janela",
        accessorFn: (r) => `${r.data}T${r.janelaInicio}`,
        header: t("tabela.janela"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
            {formatarDataLocale(row.original.data, idioma)} · {row.original.janelaInicio}–{row.original.janelaFim}
          </span>
        ),
      },
      {
        accessorKey: "equipaNome",
        id: "equipa",
        header: t("tabela.equipa"),
        cell: ({ row }) => <span className="truncate text-muted-foreground">{row.original.equipaNome ?? "—"}</span>,
      },
      {
        accessorKey: "operadorId",
        id: "operador",
        header: t("comum.operador"),
        cell: ({ row }) => <EtiquetaOperador id={row.original.operadorId} soPonto />,
        enableSorting: false,
      },
      {
        accessorKey: "estado",
        id: "estado",
        header: t("comum.estado"),
        cell: ({ row }) => <EtiquetaEstado estado={row.original.estado} />,
      },
    );
    return base;
  }, [idioma, ordens.length, selecionadas, selecionavel, t]);

  const table = useTable({
    features,
    data: ordens,
    columns: colunas,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
  });

  return (
    <div className="relative">
      <ul className="space-y-2 md:hidden">
        {table.getRowModel().rows.map((row) => {
          const ordem = row.original;
          return (
            <li key={ordem.id}>
              <button
                type="button"
                onClick={() => abrir(ordem.id)}
                className={cn(
                  "superficie w-full space-y-1 p-3 text-left transition-colors hover:bg-muted/50 foco-anel",
                  ordemAberta === ordem.id && "bg-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="whitespace-nowrap font-mono text-[13px]/5 font-medium">{ordem.referencia}</span>
                  <EtiquetaEstado estado={ordem.estado} />
                </div>
                <p className="truncate text-[13px]/5">{ordem.clienteNome}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    {formatarDataLocale(ordem.data, idioma)} · {ordem.janelaInicio}–{ordem.janelaFim}
                  </span>
                  <EtiquetaOperador id={ordem.operadorId} soPonto />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="superficie hidden overflow-hidden md:block">
        <table className="w-full border-collapse text-[13px]/5">
          <thead className="sticky top-0 z-10 bg-muted/50">
            {table.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id} className="h-9 border-b border-border text-left">
                {grupo.headers.map((header) => {
                  const ordenavel = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th key={header.id} className="px-2 text-xs font-medium text-muted-foreground first:w-10 first:px-3">
                      {ordenavel ? (
                        <button
                          type="button"
                          className="group inline-flex items-center gap-1 foco-anel"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" strokeWidth={1.75} />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5" strokeWidth={1.75} />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-0 group-hover:opacity-100" strokeWidth={1.75} />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "h-9 border-b border-border transition-colors last:border-0 hover:bg-muted",
                  ordemAberta === row.original.id && "bg-accent",
                )}
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-2 first:px-3">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selecionavel && selecionadas.size > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-3 rounded-lg border border-border bg-popover px-3 py-2 shadow-[var(--shadow-popover)]">
          <span className="text-xs font-medium">{t("tabela.selecionadas", { n: selecionadas.size })}</span>
          <Button type="button" size="sm" variant="outline">
            {t("tabela.reagendar")}
          </Button>
          <Button type="button" size="sm" variant="outline">
            {t("tabela.cancelar")}
          </Button>
          <Button type="button" size="sm" variant="ghost">
            {t("tabela.exportar")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
