"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/idioma/provedor";
import type { Chave } from "@/lib/i18n";
import { enviar } from "@/lib/cliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const campo = "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm";
const DIAS: Chave[] = [
  "diaSemana.d1",
  "diaSemana.d1",
  "diaSemana.d2",
  "diaSemana.d3",
  "diaSemana.d4",
  "diaSemana.d5",
  "diaSemana.d6",
  "diaSemana.d7",
];

export function AcoesEquipa({
  equipaId,
  ativa,
  zonas,
  horarios,
  membros,
  indisponibilidades,
}: {
  equipaId: string;
  ativa: boolean;
  zonas: { id: string; codigo: string; nome: string }[];
  horarios: { diaSemana: number; inicio: string; fim: string }[];
  membros: { id: string; nome: string; ativo: boolean }[];
  indisponibilidades: { id: string; data: string; inicio: string; fim: string; motivo: string }[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aTrabalhar, setATrabalhar] = useState(false);

  async function executar(trabalho: () => Promise<void>) {
    setErro(null);
    setATrabalhar(true);
    try {
      await trabalho();
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    } finally {
      setATrabalhar(false);
    }
  }

  return (
    <div className="space-y-8">
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      <div>
        <Button
          variant="outline"
          disabled={aTrabalhar}
          onClick={() => executar(() => enviar(`/api/equipas/${equipaId}`, { ativa: !ativa }, "PATCH").then(() => undefined))}
        >
          {ativa ? t("equipas.desativarEquipa") : t("equipas.ativarEquipa")}
        </Button>
      </div>

      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          const dados = new FormData(evento.currentTarget);
          const linhas = horarios.map((linha) => ({
            diaSemana: linha.diaSemana,
            inicio: String(dados.get(`inicio-${linha.diaSemana}`)),
            fim: String(dados.get(`fim-${linha.diaSemana}`)),
          }));
          void executar(() => enviar(`/api/equipas/${equipaId}`, { horarios: linhas }, "PATCH").then(() => undefined));
        }}
      >
        <h2 className="text-base font-semibold tracking-tight">{t("equipas.horario")}</h2>
        <ul className="space-y-2">
          {horarios.map((linha) => {
            const dia = t(DIAS[linha.diaSemana] ?? "diaSemana.d1");
            return (
              <li key={linha.diaSemana} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2">
                <span className="text-sm capitalize">{dia}</span>
                <Input name={`inicio-${linha.diaSemana}`} defaultValue={linha.inicio} aria-label={t("equipas.inicioDe", { dia })} />
                <Input name={`fim-${linha.diaSemana}`} defaultValue={linha.fim} aria-label={t("equipas.fimDe", { dia })} />
              </li>
            );
          })}
        </ul>
        <Button type="submit" variant="outline" disabled={aTrabalhar}>
          {t("equipas.guardarHorario")}
        </Button>
      </form>

      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          const dados = new FormData(evento.currentTarget);
          const fim = String(dados.get("fim") ?? "");
          void executar(() =>
            enviar(`/api/equipas/${equipaId}/zona`, {
              zonaId: String(dados.get("zonaId")),
              inicio: String(dados.get("inicio")),
              fim: fim || null,
              confirmacao: dados.get("confirmacao") === "on",
            }).then(() => undefined),
          );
        }}
      >
        <h2 className="text-base font-semibold tracking-tight md:col-span-2">{t("equipas.zonaVigor")}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="zona">{t("equipas.zona")}</Label>
          <select id="zona" name="zonaId" className={campo} defaultValue={zonas[0]?.id}>
            {zonas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.codigo} · {zona.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inicio-zona">{t("comum.desde")}</Label>
          <Input id="inicio-zona" name="inicio" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fim-zona">{t("comum.ate")}</Label>
          <Input id="fim-zona" name="fim" type="date" />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="confirmacao" />
          {t("equipas.confirmarPassado")}
        </label>
        <div>
          <Button type="submit" variant="outline" disabled={aTrabalhar}>
            {t("equipas.guardarZona")}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("equipas.membros")}</h2>
        <ul className="space-y-2 text-sm">
          {membros.map((membro) => (
            <li key={membro.id} className="flex items-center justify-between gap-3">
              <span>
                {membro.nome}
                {membro.ativo ? "" : ` ${t("comum.inativo")}`}
              </span>
              {membro.ativo ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={aTrabalhar}
                  onClick={() => executar(() => enviar(`/api/equipas/${equipaId}/membros/${membro.id}`, undefined, "DELETE").then(() => undefined))}
                >
                  {t("equipas.desativar")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            const formulario = evento.currentTarget;
            void executar(async () => {
              await enviar(`/api/equipas/${equipaId}/membros`, { nome: String(dados.get("nome") ?? "") });
              formulario.reset();
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="novo-tecnico">{t("equipas.novoTecnico")}</Label>
            <Input id="novo-tecnico" name="nome" required minLength={3} />
          </div>
          <Button type="submit" variant="outline" disabled={aTrabalhar}>
            {t("equipas.acrescer")}
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("equipas.indisponibilidades")}</h2>
        <ul className="space-y-2 text-sm">
          {indisponibilidades.length === 0 ? <li className="text-muted-foreground">{t("equipas.nenhumaIndisp")}</li> : null}
          {indisponibilidades.map((bloco) => (
            <li key={bloco.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {bloco.data.split("-").reverse().join("/")} {bloco.inicio}–{bloco.fim} · {bloco.motivo}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={aTrabalhar}
                onClick={() =>
                  executar(() =>
                    enviar(`/api/equipas/${equipaId}/indisponibilidades/${bloco.id}`, undefined, "DELETE").then(() => undefined),
                  )
                }
              >
                {t("comum.remover")}
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            const formulario = evento.currentTarget;
            void executar(async () => {
              await enviar(`/api/equipas/${equipaId}/indisponibilidades`, {
                data: String(dados.get("data")),
                inicio: String(dados.get("inicio")),
                fim: String(dados.get("fim")),
                motivo: String(dados.get("motivo")),
              });
              formulario.reset();
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="data-un">{t("comum.data")}</Label>
            <Input id="data-un" name="data" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-un">{t("comum.motivo")}</Label>
            <Input id="motivo-un" name="motivo" required minLength={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inicio-un">{t("comum.inicio")}</Label>
            <Input id="inicio-un" name="inicio" placeholder="12:00" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fim-un">{t("comum.fim")}</Label>
            <Input id="fim-un" name="fim" placeholder="14:00" required />
          </div>
          <div>
            <Button type="submit" variant="outline" disabled={aTrabalhar}>
              {t("equipas.novaIndisp")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
