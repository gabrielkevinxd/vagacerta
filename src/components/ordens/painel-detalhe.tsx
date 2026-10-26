"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/idioma/provedor";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LinhaOrdem } from "./tabela-ordens";

export function PainelDetalheOrdem({ ordem }: { ordem: LinhaOrdem | null }) {
  const { t } = useT();
  const router = useRouter();
  const aberto = Boolean(ordem);

  const fechar = () => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    sp.delete("ordem");
    const q = sp.toString();
    router.push(q ? `/ordens?${q}` : "/ordens", { scroll: false });
  };

  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && fechar()}>
      <SheetContent side="right" className="w-full sm:max-w-[440px]">
        {ordem ? (
          <>
            <SheetHeader className="space-y-3 border-b border-border pb-4 text-left">
              <SheetTitle className="font-mono text-base font-semibold tracking-tight">{ordem.referencia}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <EtiquetaOperador id={ordem.operadorId} />
                <EtiquetaEstado estado={ordem.estado} />
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href={`/ordens/${ordem.id}`}>{t("detalhe.resumo")}</Link>
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={fechar}>
                  {t("detalhe.fechar")}
                </Button>
              </div>
            </SheetHeader>
            <Tabs defaultValue="resumo" className="mt-4">
              <TabsList className="h-8">
                <TabsTrigger value="resumo" className="text-xs">
                  {t("detalhe.resumo")}
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">
                  {t("detalhe.historico")}
                </TabsTrigger>
                <TabsTrigger value="marcacao" className="text-xs">
                  {t("detalhe.marcacao")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="resumo" className="space-y-3 text-[13px]/5">
                <Campo rotulo={t("tabela.cliente")} valor={ordem.clienteNome} />
                <Campo rotulo={t("tabela.janela")} valor={`${ordem.janelaInicio}–${ordem.janelaFim}`} mono />
                <Campo rotulo={t("tabela.equipa")} valor={ordem.equipaNome ?? "—"} />
                <Campo rotulo={t("comum.data")} valor={ordem.data} mono />
                <p className="text-xs text-muted-foreground">{ordem.morada}</p>
              </TabsContent>
              <TabsContent value="historico" className="text-xs text-muted-foreground">
                —
              </TabsContent>
              <TabsContent value="marcacao" className="text-xs text-muted-foreground">
                —
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Campo({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
      <p className={mono ? "font-mono tabular-nums" : undefined}>{valor}</p>
    </div>
  );
}
