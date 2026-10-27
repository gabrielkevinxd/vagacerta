"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { useT } from "@/components/idioma/provedor";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import type { Idioma } from "@/lib/i18n";
import { ESTADOS_ORDEM, OPERADORES, hojeLisboa, type EstadoOrdem, type OperadorId } from "@/lib/rules";

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `/ordens?${s}` : "/ordens";
}

export function FiltrosChips({
  estado,
  data,
  q,
  operador,
  vista,
  mostrarOperador,
  idioma,
  dataDemonstracao,
}: {
  estado?: string;
  data?: string;
  q?: string;
  operador?: string;
  vista?: string;
  mostrarOperador: boolean;
  idioma: Idioma;
  dataDemonstracao: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const base = { estado, data, q, operador, vista };
  const chips: { chave: string; rotulo: string; limpar: Record<string, string | undefined> }[] = [];
  if (estado) {
    chips.push({
      chave: "estado",
      rotulo: t("filtros.estadoE", { valor: t(`estado.${estado as EstadoOrdem}`) }),
      limpar: { ...base, estado: undefined },
    });
  }
  if (operador) {
    chips.push({
      chave: "operador",
      rotulo: t("filtros.operadorE", { valor: t(`operador.${operador as OperadorId}`) }),
      limpar: { ...base, operador: undefined },
    });
  }
  if (data) {
    chips.push({
      chave: "data",
      rotulo: t("filtros.dataE", { valor: formatarDataLocale(data, idioma) }),
      limpar: { ...base, data: undefined },
    });
  }
  if (q) {
    chips.push({
      chave: "q",
      rotulo: t("filtros.pesquisaE", { valor: q }),
      limpar: { ...base, q: undefined },
    });
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-2">
      <form
        className="relative"
        action="/ordens"
        onSubmit={(evento) => {
          evento.preventDefault();
          const valor = new FormData(evento.currentTarget).get("q");
          router.push(qs({ ...base, q: String(valor || "") || undefined }));
        }}
      >
        {estado ? <input type="hidden" name="estado" value={estado} /> : null}
        {data ? <input type="hidden" name="data" value={data} /> : null}
        {operador ? <input type="hidden" name="operador" value={operador} /> : null}
        {vista ? <input type="hidden" name="vista" value={vista} /> : null}
        <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("ordens.placeholder")}
          className="h-8 w-64 pl-8"
        />
      </form>
      {chips.map((chip) => (
        <Link
          key={chip.chave}
          href={qs(chip.limpar)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[13px]/5 font-medium text-foreground transition-colors hover:bg-muted foco-anel"
        >
          {chip.rotulo}
          <X className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
        </Link>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="gap-1">
            <Plus className="size-3.5" strokeWidth={1.75} />
            {t("filtros.adicionar")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{t("comum.estado")}</DropdownMenuLabel>
          {ESTADOS_ORDEM.map((item) => (
            <DropdownMenuItem key={item} onSelect={() => router.push(qs({ ...base, estado: item }))}>
              {t(`estado.${item}`)}
            </DropdownMenuItem>
          ))}
          {mostrarOperador ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("comum.operador")}</DropdownMenuLabel>
              {OPERADORES.map((item) => (
                <DropdownMenuItem key={item} onSelect={() => router.push(qs({ ...base, operador: item }))}>
                  {t(`operador.${item}`)}
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("comum.data")}</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => {
              router.push(qs({ ...base, data: hojeLisboa() }));
            }}
          >
            {t("comum.hoje")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push(qs({ ...base, data: dataDemonstracao }))}>
            {t("painel.demonstracao")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {chips.length > 0 ? (
        <Link href={qs({ vista })} className="text-xs font-medium text-muted-foreground hover:text-foreground">
          {t("filtros.limpar")}
        </Link>
      ) : null}
    </div>
  );
}
