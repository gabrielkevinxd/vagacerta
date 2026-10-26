"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QUEM_PEDIU } from "@/lib/rules/tipos";
import { useT } from "@/components/idioma/provedor";
import type { EstadoOrdem } from "@/lib/rules/tipos";
import { enviar } from "@/lib/cliente";
import { PainelReencaixe } from "@/components/painel-reencaixe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const campo = "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm";

export function AcoesOrdem({
  ordemId,
  estado,
  tecnico,
  podeCancelar,
  podeReagendar,
  podeMarcar,
  podeEditarFicha,
  central,
  equipas,
  janelas,
  ficha,
}: {
  ordemId: string;
  estado: EstadoOrdem;
  tecnico: boolean;
  podeCancelar: boolean;
  podeReagendar: boolean;
  podeMarcar: boolean;
  podeEditarFicha: boolean;
  central: boolean;
  equipas: { id: string; nome: string }[];
  janelas: { codigo: string; inicio: string; fim: string }[];
  ficha: { clienteNome: string; clienteContacto: string; morada: string; nota: string; prioridade: string };
}) {
  const { t } = useT();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aTrabalhar, setATrabalhar] = useState(false);

  async function executar(trabalho: () => Promise<void>) {
    setErro(null);
    setAviso(null);
    setATrabalhar(true);
    try {
      await trabalho();
      setAviso(t("definicoes.guardada"));
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    } finally {
      setATrabalhar(false);
    }
  }

  return (
    <div className="space-y-6">
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      {aviso ? <p className="text-sm">{aviso}</p> : null}

      {tecnico && estado === "agendada" ? (
        <Button disabled={aTrabalhar} onClick={() => executar(() => enviar(`/api/ordens/${ordemId}/estado`, { estado: "em_curso" }).then(() => undefined))}>
          {t("ordens.marcarEmCurso")}
        </Button>
      ) : null}
      {tecnico && estado === "em_curso" ? (
        <Button disabled={aTrabalhar} onClick={() => executar(() => enviar(`/api/ordens/${ordemId}/estado`, { estado: "concluida" }).then(() => undefined))}>
          {t("ordens.marcarConcluida")}
        </Button>
      ) : null}

      {podeEditarFicha ? (
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            void executar(() =>
              enviar(`/api/ordens/${ordemId}`, {
                clienteNome: String(dados.get("clienteNome") ?? ""),
                clienteContacto: String(dados.get("clienteContacto") ?? ""),
                morada: String(dados.get("morada") ?? ""),
                nota: String(dados.get("nota") ?? ""),
                prioridade: String(dados.get("prioridade") ?? "media"),
              }, "PATCH").then(() => undefined),
            );
          }}
        >
          <h2 className="font-heading text-xl md:col-span-2">{t("ordens.ficha")}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="clienteNome">{t("ordens.cliente")}</Label>
            <Input id="clienteNome" name="clienteNome" required minLength={3} defaultValue={ficha.clienteNome} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clienteContacto">{t("ordens.contacto")}</Label>
            <Input id="clienteContacto" name="clienteContacto" required minLength={5} defaultValue={ficha.clienteContacto} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="morada">{t("ordens.morada")}</Label>
            <Input id="morada" name="morada" required minLength={5} defaultValue={ficha.morada} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="nota">{t("ordens.nota")}</Label>
            <Textarea id="nota" name="nota" defaultValue={ficha.nota} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prioridade">{t("ordens.prioridade")}</Label>
            <select id="prioridade" name="prioridade" className={campo} defaultValue={ficha.prioridade}>
              <option value="alta">{t("prioridade.alta")}</option>
              <option value="media">{t("prioridade.media")}</option>
              <option value="baixa">{t("prioridade.baixa")}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="outline" disabled={aTrabalhar}>
              {t("ordens.gravarFicha")}
            </Button>
          </div>
        </form>
      ) : null}

      {podeMarcar ? (
        <form
          className="space-y-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            const equipaId = String(dados.get("equipaId") ?? "");
            void executar(() => enviar(`/api/ordens/${ordemId}/marcar`, equipaId ? { equipaId } : {}).then(() => undefined));
          }}
        >
          <h2 className="font-heading text-xl">{t("ordens.marcar")}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="equipa-marcar">{t("comum.equipa")}</Label>
            <select id="equipa-marcar" name="equipaId" className={campo} defaultValue="">
              <option value="">{t("ordens.primeiraEquipa")}</option>
              {equipas.map((equipa) => (
                <option key={equipa.id} value={equipa.id}>
                  {equipa.nome}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={aTrabalhar}>
            {t("ordens.agendar")}
          </Button>
        </form>
      ) : null}

      {podeReagendar ? (
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            const janela = String(dados.get("janela") ?? "");
            const [janelaInicio, janelaFim] = janela.split("|");
            const inicio = String(dados.get("inicioPlaneado") ?? "");
            const corpo: Record<string, string | null> = {};
            const equipaId = String(dados.get("equipaId") ?? "");
            const data = String(dados.get("data") ?? "");
            if (equipaId) corpo.equipaId = equipaId;
            if (data) corpo.data = data;
            if (janelaInicio && janelaFim) {
              corpo.janelaInicio = janelaInicio;
              corpo.janelaFim = janelaFim;
            }
            if (inicio) corpo.inicioPlaneado = inicio;
            void executar(() => enviar(`/api/ordens/${ordemId}/reagendar`, corpo).then(() => undefined));
          }}
        >
          <h2 className="font-heading text-xl md:col-span-2">{t("ordens.reagendar")}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="equipa-reagendar">{t("comum.equipa")}</Label>
            <select id="equipa-reagendar" name="equipaId" className={campo} defaultValue="">
              <option value="">{t("ordens.manterEquipa")}</option>
              {equipas.map((equipa) => (
                <option key={equipa.id} value={equipa.id}>
                  {equipa.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="data-reagendar">{t("comum.data")}</Label>
            <Input id="data-reagendar" name="data" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="janela-reagendar">{t("ordens.janela")}</Label>
            <select id="janela-reagendar" name="janela" className={campo} defaultValue="">
              <option value="">{t("ordens.manterJanela")}</option>
              {janelas.map((linha) => (
                <option key={`${linha.codigo}-${linha.inicio}`} value={`${linha.inicio}|${linha.fim}`}>
                  {linha.codigo} {linha.inicio}–{linha.fim}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inicio-reagendar">{t("ordens.inicioFixo")}</Label>
            <Input id="inicio-reagendar" name="inicioPlaneado" placeholder="HH:MM" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="outline" disabled={aTrabalhar}>
              {t("ordens.reagendar")}
            </Button>
          </div>
        </form>
      ) : null}

      {estado === "em_espera" && !tecnico ? (
        <div className="space-y-2">
          <h2 className="font-heading text-xl">{t("ordens.encaixeFila")}</h2>
          <PainelReencaixe
            pedido={{ encaixarId: ordemId, permitirTroca: central }}
            rotulo={t("ordens.previsEncaixe")}
          />
        </div>
      ) : null}

      {podeCancelar ? (
        <div className="space-y-4">
          <h2 className="font-heading text-xl">{t("ordens.cancelarTitulo")}</h2>
          <form
            className="space-y-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              const dados = new FormData(evento.currentTarget);
              void executar(() =>
                enviar(`/api/ordens/${ordemId}/cancelar`, {
                  motivo: String(dados.get("motivo") ?? ""),
                  quemPediu: String(dados.get("quemPediu") ?? "central"),
                }).then(() => undefined),
              );
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="motivo-direto">{t("ordens.motivoSimples")}</Label>
              <Textarea id="motivo-direto" name="motivo" required minLength={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quem">{t("ordens.quemPediu")}</Label>
              <select id="quem" name="quemPediu" className={campo} defaultValue="operador">
                {QUEM_PEDIU.map((item) => (
                  <option key={item} value={item}>
                    {t(`quem.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="destructive" disabled={aTrabalhar}>
              {t("ordens.cancelarSemReencaixe")}
            </Button>
          </form>
          <PainelReencaixe pedido={{ cancelarId: ordemId }} rotulo={t("ordens.previsCancelar")} pedirMotivo />
        </div>
      ) : null}
    </div>
  );
}
