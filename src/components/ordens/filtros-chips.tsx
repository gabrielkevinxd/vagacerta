"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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
import { ESTADOS_ORDEM, OPERADORES, type EstadoOrdem, type OperadorId } from "@/lib/rules";

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
  mostrarOperador,
}: {
  estado?: string;
  data?: string;
  q?: string;
  operador?: string;
  mostrarOperador: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const base = { estado, data, q, operador };
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
      rotulo: t("filtros.dataE", { valor: data }),
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
    <div className="flex h-9 flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.chave}
          href={qs(chip.limpar)}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted foco-anel"
        >
          {chip.rotulo}
          <X className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
        </Link>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7">
            + {t("filtros.adicionar")}
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
        </DropdownMenuContent>
      </DropdownMenu>
      {chips.length > 0 ? (
        <Link href="/ordens" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          {t("filtros.limpar")}
        </Link>
      ) : null}
    </div>
  );
}
