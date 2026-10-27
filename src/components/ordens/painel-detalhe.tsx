"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import { useT } from "@/components/idioma/provedor";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { enviar } from "@/lib/cliente";
import { traduzirMensagem } from "@/lib/i18n/motor";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import type { Idioma } from "@/lib/i18n";
import { estadoCancelavel, QUEM_PEDIU, type QuemPediu } from "@/lib/rules";
import type { LinhaOrdem } from "./tabela-ordens";

function useXl() {
  const [xl, setXl] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setXl(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return xl;
}

export function PainelDetalheOrdem({
  ordem,
  idioma,
  podeAgir = true,
  quemPediuPadrao = "operador",
}: {
  ordem: LinhaOrdem | null;
  idioma: Idioma;
  podeAgir?: boolean;
  quemPediuPadrao?: QuemPediu;
}) {
  const { t, m } = useT();
  const router = useRouter();
  const xl = useXl();
  const aberto = Boolean(ordem);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [refACancelar, setRefACancelar] = useState("");
  const [idACancelar, setIdACancelar] = useState("");
  const [motivo, setMotivo] = useState("");
  const [quemPediu, setQuemPediu] = useState<QuemPediu>(quemPediuPadrao);
  const [aCancelar, setACancelar] = useState(false);

  const podeCancelarOrdem = Boolean(podeAgir && ordem && estadoCancelavel(ordem.estado));

  const fechar = () => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    sp.delete("ordem");
    const q = sp.toString();
    router.push(q ? `/ordens?${q}` : "/ordens", { scroll: false });
  };

  const pedirCancelar = () => {
    if (!ordem || !podeCancelarOrdem) return;
    setRefACancelar(ordem.referencia);
    setIdACancelar(ordem.id);
    setMotivo("");
    setQuemPediu(quemPediuPadrao);
    setConfirmarCancelar(true);
  };

  const cancelar = async () => {
    const ref = refACancelar || ordem?.referencia;
    const id = idACancelar || ordem?.id;
    const motivoLimpo = motivo.trim();
    if (!ref || !id || aCancelar || motivoLimpo.length < 3) return;
    setACancelar(true);
    try {
      await enviar(`/api/ordens/${id}/cancelar`, {
        motivo: motivoLimpo,
        quemPediu,
      });
      setConfirmarCancelar(false);
      toast(t("toast.ordemCancelada", { ref }), {
        action: {
          label: t("comum.anular"),
          onClick: () => {
            void enviar(`/api/ordens/${id}/restaurar`)
              .then(() => {
                toast(t("toast.anulado"));
                router.refresh();
              })
              .catch((falha) => {
                const texto = falha instanceof Error ? falha.message : "";
                toast.error(traduzirMensagem(m, texto) || t("comum.pedidoFalhou"));
              });
          },
        },
        duration: 6000,
      });
      fechar();
      router.refresh();
    } catch (falha) {
      const texto = falha instanceof Error ? falha.message : "";
      toast.error(traduzirMensagem(m, texto) || t("comum.pedidoFalhou"));
    } finally {
      setACancelar(false);
    }
  };

  return (
    <>
      <Sheet modal={false} open={aberto} onOpenChange={(v) => !v && fechar()}>
        <SheetContent side="right" showOverlay={!xl} className="w-full gap-0 p-0 sm:max-w-[440px]">
          {ordem ? (
            <>
              <SheetHeader className="space-y-3 border-b border-border px-4 py-4 text-left">
                <div className="flex items-start justify-between gap-2 pr-8">
                  <SheetTitle className="font-mono text-base font-semibold tracking-tight">{ordem.referencia}</SheetTitle>
                  <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
                    <Link href={`/ordens/${ordem.id}`} aria-label={t("detalhe.abrirFicha")}>
                      <ArrowUpRight className="size-4" strokeWidth={1.75} />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <EtiquetaOperador id={ordem.operadorId} />
                  <EtiquetaEstado estado={ordem.estado} />
                </div>
              </SheetHeader>
              <div className="space-y-3 px-4 py-4 text-[13px]/5">
                {!estadoCancelavel(ordem.estado) && (ordem.estado === "concluida" || ordem.estado === "cancelada") ? (
                  <p className="text-muted-foreground">{t("ordens.soLeitura")}</p>
                ) : null}
                <Campo rotulo={t("tabela.cliente")} valor={ordem.clienteNome} />
                <Campo rotulo={t("tabela.janela")} valor={`${ordem.janelaInicio}–${ordem.janelaFim}`} mono />
                <Campo rotulo={t("tabela.equipa")} valor={ordem.equipaNome ?? "—"} />
                <Campo rotulo={t("comum.data")} valor={formatarDataLocale(ordem.data, idioma)} mono />
                <p className="text-xs text-muted-foreground">{ordem.morada}</p>
              </div>
              {podeAgir && podeCancelarOrdem ? (
                <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-border px-4 py-3">
                  <Button type="button" variant="outline" size="sm" disabled>
                    {t("tabela.reagendar")}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={pedirCancelar}>
                    {t("tabela.cancelarOrdem")}
                  </Button>
                </SheetFooter>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmar.cancelarOrdemTitulo", { ref: refACancelar || ordem?.referencia || "—" })}</DialogTitle>
            <DialogDescription>{t("confirmar.cancelarOrdemDetalhe")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="motivo-painel">{t("ordens.motivoSimples")}</Label>
              <Textarea
                id="motivo-painel"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
                minLength={3}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quem-painel">{t("ordens.quemPediu")}</Label>
              <select
                id="quem-painel"
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
            <Button type="button" variant="outline" onClick={() => setConfirmarCancelar(false)} disabled={aCancelar}>
              {t("comum.voltarDialog")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void cancelar()}
              disabled={aCancelar || motivo.trim().length < 3}
            >
              {t("tabela.cancelarOrdem")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
