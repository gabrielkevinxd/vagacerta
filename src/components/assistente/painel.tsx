"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/idioma/provedor";
import { Alerta as Faixa } from "@/components/layout/alerta";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Seccao } from "@/components/layout/superficie";
import { PlanoComparacao } from "@/components/plano-comparacao";
import { SeletorData } from "@/components/seletor-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AlertaAssistente, PainelAssistente, RespostaAssistente } from "@/lib/contratos/assistente";
import { enviar } from "@/lib/cliente";
import type { PedidoRealocacao } from "@/lib/rules/reencaixe";
import type { PlanoVista } from "@/lib/rules/agenda";

interface LinhaChat {
  papel: "utilizador" | "assistente";
  texto: string;
  origem?: string;
}

export function PainelAssistenteCliente({ inicial }: { inicial: PainelAssistente }) {
  const { t } = useT();
  const [painel, setPainel] = useState(inicial);
  const [data, setData] = useState(inicial.data);
  const [linhas, setLinhas] = useState<LinhaChat[]>([]);
  const [texto, setTexto] = useState("");
  const [plano, setPlano] = useState<PlanoVista | null>(null);
  const [pedidoPlano, setPedidoPlano] = useState<PedidoRealocacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aTrabalhar, setATrabalhar] = useState(false);
  const [gravado, setGravado] = useState(false);
  const fimDoChat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimDoChat.current?.scrollIntoView({ block: "nearest" });
  }, [linhas, erro, plano]);

  async function actualizar(dia: string) {
    const seguinte = await enviar<PainelAssistente>(`/api/assistente?data=${encodeURIComponent(dia)}`, undefined, "GET");
    setPainel(seguinte);
    setData(seguinte.data);
  }

  async function perguntar(valor: string, propor?: PedidoRealocacao | null) {
    const limpo = valor.trim();
    if (!limpo || aTrabalhar) return;
    setErro(null);
    setGravado(false);
    setATrabalhar(true);
    setLinhas((atual) => [...atual, { papel: "utilizador", texto: limpo }]);
    setTexto("");
    try {
      // O histórico da conversa fica no servidor (não confiar no cliente).
      const resposta = await enviar<RespostaAssistente>("/api/assistente", {
        texto: limpo,
        data,
        propor: propor ?? undefined,
      });
      setLinhas((atual) => [...atual, { papel: "assistente", texto: resposta.mensagem.texto, origem: resposta.origem }]);
      if (resposta.intencao.tipo === "reencaixar" && resposta.plano) {
        setPlano(resposta.plano);
        setPedidoPlano(resposta.intencao.pedido);
      } else {
        setPlano(null);
        setPedidoPlano(null);
      }
      setGravado(resposta.gravado);
      if (resposta.gravado) await actualizar(data);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    } finally {
      setATrabalhar(false);
    }
  }

  async function confirmar() {
    if (!plano || !pedidoPlano || aTrabalhar || !plano.viavel) return;
    setErro(null);
    setATrabalhar(true);
    try {
      const resposta = await enviar<RespostaAssistente>("/api/assistente", {
        texto: t("comum.confirmar"),
        data,
        confirmar: { selo: plano.selo, pedido: pedidoPlano },
      });
      setLinhas((atual) => [...atual, { papel: "assistente", texto: resposta.mensagem.texto, origem: resposta.origem }]);
      setPlano(resposta.plano);
      setGravado(resposta.gravado);
      if (!resposta.gravado) setPedidoPlano(resposta.intencao.tipo === "reencaixar" ? resposta.intencao.pedido : null);
      if (resposta.gravado) {
        toast(t("assistente.gravado"));
        await actualizar(data);
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    } finally {
      setATrabalhar(false);
    }
  }

  async function mudarData(valor: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return;
    setErro(null);
    setATrabalhar(true);
    try {
      await actualizar(valor);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    } finally {
      setATrabalhar(false);
    }
  }

  const exemplos = [
    { rotulo: t("assistente.exAlertas"), propor: null as PedidoRealocacao | null },
    { rotulo: t("assistente.exQuotas"), propor: null },
    { rotulo: t("assistente.exFila"), propor: null },
    { rotulo: t("assistente.exEquilibrio"), propor: null },
  ];

  const modo =
    painel.modoChat === "ia" && painel.modelo ? t("assistente.modoIa", { modelo: painel.modelo }) : t("assistente.modoSemIa");

  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo={t("assistente.titulo")} descricao={t("assistente.intro")} accoes={<SeletorData valor={data} onChange={(iso) => void mudarData(iso)} />} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <Seccao titulo={t("assistente.alertasTitulo")} descricao={t("assistente.alertasIntro")}>
          <p className="text-[13px]/5 text-muted-foreground">{painel.resumo}</p>
          {painel.alertas.length === 0 ? (
            <p className="text-[13px]/5">{t("assistente.alertasVazios")}</p>
          ) : (
            <ul className="space-y-2">
              {painel.alertas.map((alerta) => (
                <CartaoAlerta
                  key={alerta.id}
                  alerta={alerta}
                  podePropor={painel.podePropor}
                  aTrabalhar={aTrabalhar}
                  onPrever={(pedido) => void perguntar(t("assistente.previsualizar"), pedido)}
                />
              ))}
            </ul>
          )}
        </Seccao>
        <Seccao titulo={t("assistente.chatTitulo")} descricao={modo}>
          <div className="flex flex-wrap gap-2" aria-label={t("assistente.exemplos")}>
            {exemplos.map((exemplo) => (
              <Button
                key={exemplo.rotulo}
                type="button"
                variant="outline"
                size="default"
                className="h-8 max-w-full whitespace-nowrap text-left"
                title={exemplo.rotulo}
                disabled={aTrabalhar}
                onClick={() => void perguntar(exemplo.rotulo, exemplo.propor)}
              >
                <span className="truncate">{exemplo.rotulo}</span>
              </Button>
            ))}
          </div>
          <div className="superficie max-h-[28rem] min-h-48 space-y-2 overflow-y-auto p-3" role="log" aria-live="polite">
            {linhas.length === 0 ? <p className="text-[13px]/5 text-muted-foreground">{t("assistente.ajuda")}</p> : null}
            {linhas.map((linha, indice) => (
              <article
                key={`${linha.papel}-${indice}`}
                className={linha.papel === "utilizador" ? "ml-6 rounded-md bg-muted px-3 py-2" : "mr-6 rounded-md border border-border px-3 py-2"}
              >
                <p className="text-xs text-muted-foreground">{linha.papel === "utilizador" ? t("assistente.eu") : t("nav.assistente")}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-[13px]/5">{linha.texto}</p>
                {linha.origem ? <p className="mt-1 text-xs text-muted-foreground">{linha.origem}</p> : null}
              </article>
            ))}
            <div ref={fimDoChat} />
          </div>
          <form
            className="space-y-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              void perguntar(texto);
            }}
          >
            <label className="block text-[13px]/5" htmlFor="pergunta-assistente">
              {t("assistente.pergunta")}
            </label>
            <Textarea
              id="pergunta-assistente"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("assistente.placeholder")}
            />
            <Button type="submit" size="sm" disabled={aTrabalhar || texto.trim().length === 0}>
              {aTrabalhar ? t("assistente.aPensar") : t("assistente.enviar")}
            </Button>
          </form>
          {erro ? (
            <Faixa tom="erro" role="alert">
              {erro}
            </Faixa>
          ) : null}
          {plano ? (
            <div className="superficie space-y-3 p-3">
              <PlanoComparacao plano={plano} />
              <Faixa tom={gravado ? "sucesso" : plano.viavel ? "info" : "aviso"}>{gravado ? t("assistente.gravado") : t("assistente.nadaGravado")}</Faixa>
              {painel.podePropor && plano.viavel && !gravado ? (
                <Button type="button" size="sm" disabled={aTrabalhar} onClick={() => void confirmar()}>
                  {t("assistente.confirmarPlano")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </Seccao>
      </div>
      <Seccao titulo={t("assistente.comoTitulo")}>
        <ul className="list-disc space-y-1 pl-5 text-[13px]/5 text-muted-foreground">
          <li>{t("assistente.comoRegras")}</li>
          <li>{t("assistente.comoMotor")}</li>
          <li>{t("assistente.comoPerfil")}</li>
        </ul>
      </Seccao>
    </div>
  );
}

function CartaoAlerta({
  alerta,
  podePropor,
  aTrabalhar,
  onPrever,
}: {
  alerta: AlertaAssistente;
  podePropor: boolean;
  aTrabalhar: boolean;
  onPrever: (pedido: PedidoRealocacao) => void;
}) {
  const { t } = useT();
  return (
    <li className="superficie space-y-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {alerta.gravidade === "alta" ? (
          <Badge variant="destructive" className="gap-1">
            <TriangleAlert className="size-3" strokeWidth={1.75} aria-hidden />
            {t("assistente.gravidadeAlta")}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <CircleAlert className="size-3" strokeWidth={1.75} aria-hidden />
            {t("assistente.gravidadeMedia")}
          </Badge>
        )}
        <p className="text-[13px]/5 font-medium">{alerta.titulo}</p>
      </div>
      <p className="text-[13px]/5 text-muted-foreground">{alerta.detalhe}</p>
      {podePropor && alerta.pedido ? (
        <Button type="button" variant="outline" size="sm" disabled={aTrabalhar} onClick={() => onPrever(alerta.pedido!)}>
          {t("assistente.previsualizar")}
        </Button>
      ) : null}
    </li>
  );
}
