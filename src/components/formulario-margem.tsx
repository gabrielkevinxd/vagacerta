"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/idioma/provedor";
import { enviar } from "@/lib/cliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularioMargem({ minutos }: { minutos: number }) {
  const { t } = useT();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);

  return (
    <form
      className="max-w-sm space-y-3"
      onSubmit={async (evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        setAGuardar(true);
        setErro(null);
        setAviso(null);
        try {
          await enviar("/api/definicoes", { margemDeslocacaoMin: Number(dados.get("margem")) }, "PUT");
          setAviso(t("definicoes.guardada"));
          router.refresh();
        } catch (falha) {
          setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
        } finally {
          setAGuardar(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="margem">{t("definicoes.margem")}</Label>
        <Input id="margem" name="margem" type="number" min={0} max={180} defaultValue={minutos} required />
      </div>
      <p className="text-[13px]/5 text-muted-foreground">{t("definicoes.ajuda")}</p>
      {erro ? (
        <p role="alert" className="text-[13px]/5 text-destructive">
          {erro}
        </p>
      ) : null}
      {aviso ? <p className="text-[13px]/5">{aviso}</p> : null}
      <Button type="submit" disabled={aGuardar}>
        {aGuardar ? t("comum.aGuardar") : t("comum.guardar")}
      </Button>
    </form>
  );
}
