import Link from "next/link";
import { Suspense } from "react";
import { janelasDe } from "@/lib/rules/catalogo";
import { eCentral, podeCancelar, podeMarcarOperador, podeReagendar } from "@/lib/rules";
import { AcoesOrdem } from "@/components/acoes-ordem";
import { Carregamento } from "@/components/carregamento";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { formatarDataLocale, formatarInstante } from "@/lib/i18n/formatacao";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarEquipas, obterOrdem } from "@/server/servicos";

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, idioma } = await i18nPedido();
  const ator = await exigirAtorPagina();
  const { ordem, historico } = obterOrdem(ator, id);
  const equipas = listarEquipas(ator).map((equipa) => ({ id: equipa.id, nome: equipa.nome }));
  const janelas = janelasDe(ordem.operadorId, ordem.categoria);
  const central = eCentral(ator);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/ordens" className="text-[13px]/5 text-muted-foreground underline">
          {t("nav.ordens")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{ordem.referencia}</h1>
          <EtiquetaOperador id={ordem.operadorId} nome={ordem.operadorNome} />
          <EtiquetaEstado estado={ordem.estado} />
        </div>
        <p className="text-[13px]/5 text-muted-foreground">
          {t(`categoria.${ordem.categoria}`)}
          {ordem.tecnologia ? ` · ${t(`tecnologia.${ordem.tecnologia}`)}` : ""} · {t(`prioridade.${ordem.prioridade}`)} ·{" "}
          {ordem.duracaoMin} {t("comum.minutos")}
        </p>
        <p className="max-w-2xl text-[13px]/5 text-muted-foreground">{t("ordens.janelaAjuda")}</p>
        <Link href={`/agenda?vista=dia&data=${ordem.data}`} className="inline-block text-[13px]/5 underline">
          {t("ordens.verDiaAgenda")}
        </Link>
      </div>
      <dl className="grid gap-3 superficie p-4 text-[13px]/5 md:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t("ordens.cliente")}</dt>
          <dd>
            {ordem.clienteNome} · {ordem.clienteContacto}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("ordens.morada")}</dt>
          <dd>
            {ordem.morada} · {ordem.area} · {ordem.zonaNome}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("ordens.janela")}</dt>
          <dd>
            {formatarDataLocale(ordem.data, idioma)} · {ordem.janelaInicio}–{ordem.janelaFim}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("ordens.plano")}</dt>
          <dd>
            {ordem.inicioPlaneado ? `${ordem.inicioPlaneado}–${ordem.fimPlaneado}` : t("comum.porDefinir")}
            {ordem.equipaNome ? ` · ${ordem.equipaNome}` : ""}
            {ordem.inicioFixado ? ` · ${t("ordens.inicioFixoMarca")}` : ""}
          </dd>
        </div>
        {ordem.nota ? (
          <div className="md:col-span-2">
            <dt className="text-muted-foreground">{t("ordens.nota")}</dt>
            <dd>{ordem.nota}</dd>
          </div>
        ) : null}
        {ordem.motivoCancelamento ? (
          <div className="md:col-span-2">
            <dt className="text-muted-foreground">{t("ordens.cancelamento")}</dt>
            <dd>
              {ordem.motivoCancelamento}
              {ordem.quemPediu ? ` · ${t(`quem.${ordem.quemPediu}`)}` : ""}
            </dd>
          </div>
        ) : null}
      </dl>
      {ator.papel !== "tecnico" ? (
        <p className="flex flex-wrap gap-4 text-[13px]/5">
          {ordem.estado === "em_espera" ? (
            <Link
              className="underline"
              href={`/otimizador?data=${encodeURIComponent(ordem.data)}&modo=encaixar&ordemId=${encodeURIComponent(ordem.id)}&prever=1${central ? "&troca=1" : ""}`}
            >
              {t("ordens.previsEncaixe")}
            </Link>
          ) : null}
          {podeCancelar(ator, ordem) ? (
            <Link
              className="underline"
              href={`/otimizador?data=${encodeURIComponent(ordem.data)}&modo=cancelar&ordemId=${encodeURIComponent(ordem.id)}`}
            >
              {t("ordens.cancelarComReencaixe")}
            </Link>
          ) : null}
        </p>
      ) : null}
      <AcoesOrdem
        ordemId={ordem.id}
        estado={ordem.estado}
        tecnico={ator.papel === "tecnico"}
        podeCancelar={podeCancelar(ator, ordem)}
        podeReagendar={podeReagendar(ator, ordem)}
        podeMarcar={(ordem.estado === "pendente" || ordem.estado === "em_espera") && podeMarcarOperador(ator, ordem.operadorId)}
        podeEditarFicha={ator.papel !== "tecnico"}
        central={central}
        quemPediuPadrao={ator.papel === "despachante" ? "operador" : "central"}
        equipas={equipas}
        janelas={janelas}
        ficha={{
          clienteNome: ordem.clienteNome,
          clienteContacto: ordem.clienteContacto,
          morada: ordem.morada,
          nota: ordem.nota,
          prioridade: ordem.prioridade,
        }}
      />
      <section className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{t("ordens.historico")}</h2>
        {historico.length === 0 ? <p className="text-[13px]/5 text-muted-foreground">{t("ordens.aindaSemMovimentos")}</p> : null}
        <ol className="space-y-2">
          {historico.map((linha) => (
            <li key={linha.id} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px]/5">
              <p>{linha.detalhe}</p>
              <p className="text-muted-foreground">
                {formatarInstante(linha.quando, idioma)}
                {linha.autor ? ` · ${linha.autor}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Conteudo params={params} />
    </Suspense>
  );
}
