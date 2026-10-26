"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlanoVista } from "@/lib/rules/agenda";
import type { PedidoRealocacao } from "@/lib/rules/reencaixe";
import { useT } from "@/components/idioma/provedor";
import { enviar } from "@/lib/cliente";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Coluna({ titulo, linhas }: { titulo: string; linhas: PlanoVista["antes"] }) {
  const { t } = useT();
  return (
    <div className="superficie p-3">
      <h3 className="text-sm font-semibold tracking-tight">{titulo}</h3>
      <ul className="mt-3 space-y-3">
        {linhas.map((linha) => (
          <li key={linha.equipaId}>
            <p className="text-sm font-medium">{linha.nome}</p>
            {linha.blocos.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("comum.semVisitasDia")}</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {linha.blocos.map((bloco) => (
                  <li key={bloco.id}>
                    {bloco.inicio}–{bloco.fim}{" "}
                    {bloco.vista === "ocupada" ? (
                      <span className="text-muted-foreground">{t("comum.ocupadaMin", { n: bloco.duracaoMin })}</span>
                    ) : (
                      <span>
                        {bloco.referencia} · {bloco.clienteNome}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PainelReencaixe({
  pedido,
  rotulo,
  pedirMotivo = false,
}: {
  pedido: PedidoRealocacao;
  rotulo: string;
  pedirMotivo?: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [plano, setPlano] = useState<PlanoVista | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aTrabalhar, setATrabalhar] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const pedidoFinal = pedirMotivo ? { ...pedido, motivo: motivo.trim() || pedido.motivo } : pedido;

  async function previsualizar() {
    setErro(null);
    setConfirmado(false);
    if (pedirMotivo && motivo.trim().length < 3) {
      setErro(t("reencaixe.motivoCurto"));
      return;
    }
    setATrabalhar(true);
    try {
      setPlano(await enviar<PlanoVista>("/api/otimizar", pedidoFinal));
    } catch (falha) {
      setPlano(null);
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    } finally {
      setATrabalhar(false);
    }
  }

  async function confirmar() {
    if (!plano) return;
    setATrabalhar(true);
    setErro(null);
    try {
      setPlano(await enviar<PlanoVista>("/api/otimizar/confirmar", { pedido: pedidoFinal, selo: plano.selo }));
      setConfirmado(true);
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    } finally {
      setATrabalhar(false);
    }
  }

  return (
    <div className="space-y-3">
      {pedirMotivo ? (
        <div className="space-y-1.5">
          <Label htmlFor={`motivo-${rotulo}`}>{t("comum.motivo")}</Label>
          <Textarea id={`motivo-${rotulo}`} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} />
        </div>
      ) : null}
      <Button type="button" variant="secondary" disabled={aTrabalhar} onClick={previsualizar}>
        {aTrabalhar ? t("comum.aCalcular") : rotulo}
      </Button>
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      {plano ? (
        <div className="space-y-3">
          <p className={`text-sm ${plano.viavel ? "" : "text-destructive"}`}>{plano.mensagem}</p>
          {plano.movimentos.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {plano.movimentos.map((movimento) => (
                <li key={`${movimento.tipo}-${movimento.ordemId}-${movimento.paraEquipaId}`}>
                  {movimento.referencia}: {movimento.motivo}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Coluna titulo={t("reencaixe.antes")} linhas={plano.antes} />
            <Coluna titulo={t("reencaixe.depois")} linhas={plano.depois} />
          </div>
          {plano.viavel && !confirmado ? (
            <Button type="button" disabled={aTrabalhar} onClick={confirmar}>
              {t("comum.confirmarPlano")}
            </Button>
          ) : null}
          {confirmado ? <p className="text-sm">{t("reencaixe.aplicado")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
