"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import {
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useT } from "@/components/idioma/provedor";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { enviar } from "@/lib/cliente";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import type { Idioma } from "@/lib/i18n";
import { estadoCancelavel, QUEM_PEDIU, type EstadoOrdem, type OperadorId, type QuemPediu } from "@/lib/rules";
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

function exportarCsv(
  ordens: LinhaOrdem[],
  idioma: Idioma,
  rotulo: (ordem: LinhaOrdem) => { operador: string; estado: string },
) {
  const cabecalho = ["ref", "cliente", "data", "janela", "equipa", "operador", "estado"];
  const linhas = ordens.map((ordem) => {
    const nomes = rotulo(ordem);
    return [
      ordem.referencia,
      ordem.clienteNome,
      formatarDataLocale(ordem.data, idioma),
      `${ordem.janelaInicio}-${ordem.janelaFim}`,
      ordem.equipaNome ?? "",
      nomes.operador,
      nomes.estado,
    ]
      .map((celula) => `"${String(celula).replaceAll('"', '""')}"`)
      .join(";");
  });
  const blob = new Blob(["\uFEFF" + [cabecalho.join(";"), ...linhas].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = `ordens-${new Date().toISOString().slice(0, 10)}.csv`;
  ancora.click();
  URL.revokeObjectURL(url);
}

export function TabelaOrdens({
  ordens,
  idioma,
  ordemAberta,
  selecionavel = true,
  quemPediuPadrao = "operador",
}: {
  ordens: LinhaOrdem[];
  idioma: Idioma;
  ordemAberta?: string;
  selecionavel?: boolean;
  quemPediuPadrao?: QuemPediu;
}) {
  const { t } = useT();
  const router = useRouter();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "janela", desc: false }]);
  const [confirmarMassa, setConfirmarMassa] = useState(false);
  const [aCancelarMassa, setACancelarMassa] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [quemPediu, setQuemPediu] = useState<QuemPediu>(quemPediuPadrao);

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
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
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
          <button
            type="button"
            onClick={() => abrir(row.original.id)}
            className="whitespace-nowrap font-mono text-[13px]/5 font-medium tabular-nums foco-anel"
          >
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
        cell: ({ row }) => (
          <div className="min-w-[7.5rem]">
            <EtiquetaEstado estado={row.original.estado} />
          </div>
        ),
      },
    );
    return base;
  }, [idioma, ordens.length, selecionavel, t]);

  const table = useTable({
    features,
    data: ordens,
    columns: colunas,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    enableRowSelection: selecionavel,
  });

  const limparSelecao = () => {
    table.resetRowSelection();
    setRowSelection({});
  };

  const ordensSelecionadas = table.getSelectedRowModel().rows.map((row) => row.original);
  const cancelaveis = ordensSelecionadas.filter((ordem) => estadoCancelavel(ordem.estado));
  const ignoradas = ordensSelecionadas.length - cancelaveis.length;

  const abrirCancelarMassa = () => {
    setMotivo("");
    setQuemPediu(quemPediuPadrao);
    setConfirmarMassa(true);
  };

  const cancelarMassa = async () => {
    const motivoLimpo = motivo.trim();
    if (aCancelarMassa || cancelaveis.length === 0 || motivoLimpo.length < 3) return;
    setACancelarMassa(true);
    let ok = 0;
    let falhas = 0;
    for (const ordem of cancelaveis) {
      try {
        await enviar(`/api/ordens/${ordem.id}/cancelar`, {
          motivo: motivoLimpo,
          quemPediu,
        });
        ok += 1;
      } catch {
        falhas += 1;
      }
    }
    setConfirmarMassa(false);
    setACancelarMassa(false);
    limparSelecao();
    if (ok > 0) toast(t("toast.ordensCanceladas", { n: ok }));
    if (falhas > 0) toast.error(t("toast.ordensCancelarFalhas", { n: falhas }));
    router.refresh();
  };

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
                  const sel = header.column.id === "sel";
                  return (
                    <th
                      key={header.id}
                      className={cn("px-2 text-xs font-medium text-muted-foreground", sel && "w-10 px-3")}
                    >
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
                  <td key={cell.id} className={cn("px-2", cell.column.id === "sel" && "px-3")}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selecionavel && ordensSelecionadas.length > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-3 rounded-lg border border-border bg-popover px-3 py-2 shadow-[var(--shadow-popover)]">
          <span className="text-xs font-medium">{t("tabela.selecionadas", { n: ordensSelecionadas.length })}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              limparSelecao();
              router.push("/agenda");
            }}
          >
            {t("tabela.reagendar")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={abrirCancelarMassa} disabled={cancelaveis.length === 0}>
            {t("tabela.cancelar")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              exportarCsv(ordensSelecionadas, idioma, (ordem) => ({
                operador: t(`operador.${ordem.operadorId}`),
                estado: t(`estado.${ordem.estado}`),
              }));
              limparSelecao();
            }}
          >
            {t("tabela.exportar")}
          </Button>
        </div>
      ) : null}

      <Dialog open={confirmarMassa} onOpenChange={setConfirmarMassa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmar.cancelarMassaTitulo", { n: cancelaveis.length })}</DialogTitle>
            <DialogDescription>
              {t("confirmar.cancelarMassaDetalhe")}
              {ignoradas > 0 ? ` ${t("confirmar.cancelarMassaIgnoradas", { n: ignoradas })}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="motivo-massa">{t("ordens.motivoSimples")}</Label>
              <Textarea
                id="motivo-massa"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
                minLength={3}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quem-massa">{t("ordens.quemPediu")}</Label>
              <select
                id="quem-massa"
                className="h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]/5"
                value={quemPediu}
                onChange={(e) => setQuemPediu(e.target.value as QuemPediu)}
              >
                {QUEM_PEDIU.map((item) => (
                  <option key={item} value={item}>
                    {t(`quem.${item}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarMassa(false)} disabled={aCancelarMassa}>
              {t("comum.voltarDialog")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void cancelarMassa()}
              disabled={aCancelarMassa || cancelaveis.length === 0 || motivo.trim().length < 3}
            >
              {t("tabela.cancelar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
