"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
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
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 md:grid-cols-[minmax(0,24rem)_1fr] md:py-16">
      <form action="/api/sessao/entrar" method="post" className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="font-heading text-3xl">{t("marca.nome")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("entrar.lead")}</p>
          <ul className="flex flex-wrap gap-3 text-xs" aria-label={t("operador.cores")}>
            <li className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm" style={{ backgroundColor: "#1d4f91" }} aria-hidden />
              {t("operador.azul")}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm" style={{ backgroundColor: "#a32020" }} aria-hidden />
              {t("operador.vermelho")}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm" style={{ backgroundColor: "#1d7a45" }} aria-hidden />
              {t("operador.verde")}
            </li>
          </ul>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("entrar.correio")}</Label>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="palavra">{t("entrar.palavraPasse")}</Label>
          <Input
            id="palavra"
            name="palavraPasse"
            type="password"
            autoComplete="current-password"
            value={palavraPasse}
            onChange={(evento) => setPalavraPasse(evento.target.value)}
            required
          />
        </div>
        {erro ? (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        ) : null}
        <Button type="submit">{t("comum.entrar")}</Button>
      </form>
      <div>
        <h2 className="font-heading text-xl">{t("entrar.contas")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("entrar.contasAjuda")}</p>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
          {CONTAS.map((conta) => (
            <li key={conta.correio}>
              <form action="/api/sessao/entrar" method="post">
                <input type="hidden" name="email" value={conta.correio} />
                <input type="hidden" name="palavraPasse" value={conta.passe} />
                <button type="submit" className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-muted">
                  <span className="text-sm font-medium">{t(conta.papel)}</span>
                  <span className="text-sm text-muted-foreground">
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
