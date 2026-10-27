"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/idioma/provedor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Chave } from "@/lib/i18n";

const CONTAS: { papel: Chave; correio: string; passe: string }[] = [
  { papel: "entrar.papelAdmin", correio: "admin@vagacerta.exemplo", passe: "vagacerta-admin" },
  { papel: "entrar.papelSupervisor", correio: "supervisor@vagacerta.exemplo", passe: "vagacerta-supervisor" },
  { papel: "entrar.papelAzul", correio: "azul@vagacerta.exemplo", passe: "vagacerta-azul" },
  { papel: "entrar.papelVermelho", correio: "vermelho@vagacerta.exemplo", passe: "vagacerta-vermelho" },
  { papel: "entrar.papelVerde", correio: "verde@vagacerta.exemplo", passe: "vagacerta-verde" },
  { papel: "entrar.papelTecnico", correio: "tecnico.minho@vagacerta.exemplo", passe: "vagacerta-tecnico" },
];

export function FormularioEntrada() {
  const { t } = useT();
  const pesquisa = useSearchParams();
  const [email, setEmail] = useState("admin@vagacerta.exemplo");
  const [palavraPasse, setPalavraPasse] = useState("vagacerta-admin");
  const codigoErro = pesquisa.get("erro");
  const erro =
    codigoErro === "credenciais"
      ? t("entrar.erroCredenciais")
      : codigoErro === "dados"
        ? t("entrar.erroDados")
        : codigoErro === "servidor"
          ? t("entrar.erroServidor")
          : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:flex-row md:py-16">
      <form action="/api/sessao/entrar" method="post" className="superficie w-full max-w-[360px] space-y-4 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
              VC
            </span>
            <p className="text-base font-semibold tracking-tight">{t("marca.nome")}</p>
          </div>
          <p className="text-[13px]/5 text-muted-foreground">{t("entrar.lead")}</p>
          <ul className="flex flex-wrap gap-3 text-xs" aria-label={t("operador.cores")}>
            <li className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-[color:var(--op-azul)]" aria-hidden />
              {t("operador.azul")}
            </li>
            <li className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-[color:var(--op-vermelho)]" aria-hidden />
              {t("operador.vermelho")}
            </li>
            <li className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-[color:var(--op-verde)]" aria-hidden />
              {t("operador.verde")}
            </li>
          </ul>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px]/5 font-medium">
            {t("entrar.correio")}
          </Label>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            className="h-8"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="palavra" className="text-[13px]/5 font-medium">
            {t("entrar.palavraPasse")}
          </Label>
          <Input
            id="palavra"
            name="palavraPasse"
            type="password"
            autoComplete="current-password"
            value={palavraPasse}
            onChange={(evento) => setPalavraPasse(evento.target.value)}
            className="h-8"
            required
          />
        </div>
        {erro ? (
          <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
            {erro}
          </p>
        ) : null}
        <Button type="submit" className="h-8 w-full">
          {t("comum.entrar")}
        </Button>
      </form>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold tracking-tight">{t("entrar.contas")}</h2>
        <p className="mt-1 text-[13px]/5 text-muted-foreground">{t("entrar.contasAjuda")}</p>
        <ul className="superficie mt-3 divide-y divide-border overflow-hidden">
          {CONTAS.map((conta) => (
            <li key={conta.correio}>
              <form action="/api/sessao/entrar" method="post">
                <input type="hidden" name="email" value={conta.correio} />
                <input type="hidden" name="palavraPasse" value={conta.passe} />
                <button
                  type="submit"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted foco-anel"
                >
                  <span className="text-[13px]/5 font-medium">{t(conta.papel)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {conta.correio} · {conta.passe}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
