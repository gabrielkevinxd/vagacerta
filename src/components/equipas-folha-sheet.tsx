"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/idioma/provedor";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OPERADORES, type OperadorId } from "@/lib/rules";
import { cn } from "@/lib/utils";

function ponto(operadorId: OperadorId) {
  const cor =
    operadorId === "azul" ? "bg-[color:var(--op-azul)]" : operadorId === "vermelho" ? "bg-[color:var(--op-vermelho)]" : "bg-[color:var(--op-verde)]";
  return <span className={cn("inline-block size-2.5 rounded-full", cor)} aria-hidden />;
}

export function EquipasFolhaSheet({
  aberta,
  fecharHref,
  fichaHref,
  equipa,
}: {
  aberta: boolean;
  fecharHref: string;
  fichaHref: string;
  equipa: {
    nome: string;
    codigo: string;
    base: string;
    distrito: string | null;
    cco: string;
    zona: { codigo: string; nome: string } | null;
    operadoresServidos: OperadorId[];
  } | null;
}) {
  const { t } = useT();
  const router = useRouter();
  return (
    <Sheet
      open={aberta}
      onOpenChange={(aberto) => {
        if (!aberto) router.push(fecharHref);
      }}
    >
      <SheetContent className="sm:max-w-md" side="right">
        {equipa ? (
          <>
            <SheetHeader>
              <SheetTitle>{equipa.nome}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-[13px]/5">
              <p className="font-mono text-[12px] text-muted-foreground">{equipa.codigo}</p>
              <p>
                {equipa.base}
                {equipa.distrito ? ` · ${equipa.distrito}` : ""} · {equipa.cco}
              </p>
              <p>{equipa.zona ? `${equipa.zona.codigo} · ${equipa.zona.nome}` : t("equipas.semZonaAviso")}</p>
              <div className="flex flex-wrap gap-1.5">
                {OPERADORES.filter((id) => equipa.operadoresServidos.includes(id)).map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5">
                    {ponto(id)}
                    {t(`operador.${id}`)}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild className="h-8">
                  <Link href={fichaHref}>{t("equipas.abrirFicha")}</Link>
                </Button>
                <Button asChild variant="outline" className="h-8">
                  <Link href={fecharHref}>{t("comum.voltar")}</Link>
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
