"use client";

import { useT } from "@/components/idioma/provedor";
import type { PlanoVista } from "@/lib/rules/agenda";

function Coluna({ titulo, linhas }: { titulo: string; linhas: PlanoVista["antes"] }) {
  const { t } = useT();
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <h3 className="font-heading text-lg">{titulo}</h3>
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

export function PlanoComparacao({ plano }: { plano: PlanoVista }) {
  const { t } = useT();
  return (
    <div className="space-y-3">
      <p className={`text-sm ${plano.viavel ? "" : "text-destructive"}`}>{plano.mensagem}</p>
      {plano.movimentos.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {plano.movimentos.map((movimento) => (
            <li key={`${movimento.tipo}-${movimento.ordemId}-${movimento.paraEquipaId}-${movimento.referencia}`}>
              {movimento.referencia}: {movimento.motivo}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Coluna titulo={t("reencaixe.antes")} linhas={plano.antes} />
        <Coluna titulo={t("reencaixe.depois")} linhas={plano.depois} />
      </div>
    </div>
  );
}
