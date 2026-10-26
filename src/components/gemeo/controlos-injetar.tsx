"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "@/lib/cliente";
import { useT } from "@/components/idioma/provedor";
import type { RelatorioGemeo } from "@/lib/contratos/gemeo";

export function BotaoInjetar({
  semente,
  semanas,
  procura,
  faltas,
  margem,
  azul,
  vermelho,
  verde,
}: {
  semente: number;
  semanas: number;
  procura: number;
  faltas: number;
  margem: number;
  azul: number;
  vermelho: number;
  verde: number;
}) {
  const { t } = useT();
  const router = useRouter();
  const [aCorrer, setACorrer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={aCorrer}
        className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        onClick={async () => {
          setErro(null);
          setACorrer(true);
          try {
            const corpo = await enviar<{ loteId: string; relatorio: RelatorioGemeo }>("/api/gemeo/injetar", {
              semente,
              semanas,
              replicas: 1,
              procura,
              probabilidadeFalta: faltas,
              margemDeslocacaoMin: margem,
              pesos: { azul, vermelho, verde },
            });
            router.push(`/gemeo?modo=injetar&lote=${encodeURIComponent(corpo.loteId)}`);
            router.refresh();
          } catch (falha) {
            setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
          } finally {
            setACorrer(false);
          }
        }}
      >
        {aCorrer ? t("gemeo.aInjetar") : t("gemeo.injetar")}
      </button>
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

export function BotaoApagarLote({ loteId }: { loteId: string }) {
  const { t } = useT();
  const router = useRouter();
  const [aCorrer, setACorrer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={aCorrer}
        className="inline-flex h-10 items-center rounded-lg border border-destructive/40 px-4 text-sm text-destructive disabled:opacity-50"
        onClick={async () => {
          setErro(null);
          setACorrer(true);
          try {
            await enviar(`/api/gemeo/lotes/${encodeURIComponent(loteId)}`, undefined, "DELETE");
            router.push("/gemeo?modo=injetar");
            router.refresh();
          } catch (falha) {
            setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
          } finally {
            setACorrer(false);
          }
        }}
      >
        {aCorrer ? t("gemeo.aApagarLote") : t("gemeo.apagarLote")}
      </button>
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
