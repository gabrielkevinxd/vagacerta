import { Suspense } from "react";
import { um } from "@/lib/consulta-pagina";
import { correrSimulacao, normalizarPedido, PEDIDO_OMISSAO } from "@/lib/gemeo";
import { traduzirMensagem } from "@/lib/i18n/motor";
import { eCentral } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { BotaoApagarLote, BotaoInjetar } from "@/components/gemeo/controlos-injetar";
import { ComparacaoPesos, BarrasPolitica, SerieDiaria, TabelaPoliticas } from "@/components/gemeo/graficos";
import { LegendaOperadores } from "@/components/legenda-operadores";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarLotes, relatorioDoLote } from "@/server/gemeo-injetar";

const campo = "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm";

function numeroConsulta(valor: string, omissao: number): number {
  if (!valor) return omissao;
  const n = Number(valor);
  return Number.isFinite(n) ? n : omissao;
}

function ligacaoModo(href: string, rotulo: string, atual: boolean) {
  return (
    <a
      href={href}
      aria-current={atual ? "page" : undefined}
      className={`inline-flex h-10 items-center rounded-lg px-4 text-sm ${atual ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
    >
      {rotulo}
    </a>
  );
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, idioma, m } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (!eCentral(ator)) {
    return (
      <div className="max-w-2xl space-y-2">
        <h1 className="font-heading text-3xl">{t("gemeo.titulo")}</h1>
        <p className="text-sm text-muted-foreground">{t("gemeo.soCentral")}</p>
      </div>
    );
  }

  const consulta = await searchParams;
  const modo = um(consulta.modo) === "injetar" ? "injetar" : "simular";
  const bruto = {
    semente: numeroConsulta(um(consulta.semente), PEDIDO_OMISSAO.semente),
    semanas: numeroConsulta(um(consulta.semanas), PEDIDO_OMISSAO.semanas),
    replicas: numeroConsulta(um(consulta.replicas), PEDIDO_OMISSAO.replicas),
    procura: numeroConsulta(um(consulta.procura), PEDIDO_OMISSAO.procura),
    probabilidadeFalta: numeroConsulta(um(consulta.faltas), PEDIDO_OMISSAO.probabilidadeFalta),
    margemDeslocacaoMin: numeroConsulta(um(consulta.margem), PEDIDO_OMISSAO.margemDeslocacaoMin),
    pesos: {
      azul: numeroConsulta(um(consulta.azul), PEDIDO_OMISSAO.pesos.azul),
      vermelho: numeroConsulta(um(consulta.vermelho), PEDIDO_OMISSAO.pesos.vermelho),
      verde: numeroConsulta(um(consulta.verde), PEDIDO_OMISSAO.pesos.verde),
    },
  };
  const normal = normalizarPedido(bruto);
  const erro = "mensagem" in normal ? traduzirMensagem(m, normal.mensagem) : null;
  const pedido = "mensagem" in normal ? PEDIDO_OMISSAO : normal;
  const lotes = listarLotes();
  const lotePedido = um(consulta.lote) || lotes[0]?.id || "";
  let relatorio = null;
  if (!erro) {
    if (modo === "injetar" && lotePedido) {
      try {
        relatorio = relatorioDoLote(lotePedido, idioma);
      } catch {
        relatorio = null;
      }
    } else if (modo === "simular") {
      relatorio = correrSimulacao(pedido, idioma);
    }
  }
  const qs = `semente=${pedido.semente}&semanas=${pedido.semanas}&replicas=${pedido.replicas}&procura=${pedido.procura}&faltas=${pedido.probabilidadeFalta}&margem=${pedido.margemDeslocacaoMin}&azul=${pedido.pesos.azul}&vermelho=${pedido.pesos.vermelho}&verde=${pedido.pesos.verde}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl">{t("gemeo.titulo")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {modo === "injetar" ? t("gemeo.introInjetar", { semente: pedido.semente }) : t("gemeo.intro", { semente: pedido.semente })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ligacaoModo(`/gemeo?modo=simular&${qs}`, t("gemeo.modoSimular"), modo === "simular")}
          {ligacaoModo(`/gemeo?modo=injetar&${qs}`, t("gemeo.modoInjetar"), modo === "injetar")}
        </div>
        <div className="mt-3">
          <LegendaOperadores compacta />
        </div>
      </div>

      <form action="/gemeo" className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
        <input type="hidden" name="modo" value={modo} />
        {lotePedido && modo === "injetar" ? <input type="hidden" name="lote" value={lotePedido} /> : null}
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("gemeo.semente")}</span>
          <input name="semente" type="number" min={1} defaultValue={pedido.semente} className={campo} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("gemeo.semanas")}</span>
          <input name="semanas" type="number" min={1} max={4} defaultValue={pedido.semanas} className={campo} />
        </label>
        {modo === "simular" ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("gemeo.replicas")}</span>
            <input name="replicas" type="number" min={1} max={8} defaultValue={pedido.replicas} className={campo} />
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">{t("gemeo.replicasInjetar")}</p>
        )}
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("gemeo.procura")}</span>
          <input name="procura" type="number" min={0.5} max={2} step={0.5} defaultValue={pedido.procura} className={campo} />
          <span className="block text-xs text-muted-foreground">{t("gemeo.procuraAjuda")}</span>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("gemeo.faltas")}</span>
          <input name="faltas" type="number" min={0} max={0.5} step={0.01} defaultValue={pedido.probabilidadeFalta} className={campo} />
          <span className="block text-xs text-muted-foreground">{t("gemeo.faltasAjuda")}</span>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("gemeo.margem")}</span>
          <input name="margem" type="number" min={0} max={90} defaultValue={pedido.margemDeslocacaoMin} className={campo} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("gemeo.pesoAzul")}</span>
          <input name="azul" type="number" min={0} step={0.05} defaultValue={pedido.pesos.azul} className={campo} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("gemeo.pesoVermelho")}</span>
          <input name="vermelho" type="number" min={0} step={0.05} defaultValue={pedido.pesos.vermelho} className={campo} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("gemeo.pesoVerde")}</span>
          <input name="verde" type="number" min={0} step={0.05} defaultValue={pedido.pesos.verde} className={campo} />
        </label>
        <div className="md:col-span-3 flex flex-wrap items-center gap-2">
          {modo === "simular" ? (
            <>
              <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                {t("gemeo.correr")}
              </button>
              <a href="/gemeo" className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm">
                {t("gemeo.semanaTipo")}
              </a>
              <a
                href="/gemeo?procura=2&semente=20261027&semanas=1&replicas=3&faltas=0.08&margem=15&azul=0.4&vermelho=0.35&verde=0.25"
                className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm"
              >
                {t("gemeo.procuraDobrar")}
              </a>
              <a
                href="/gemeo?margem=30&semente=20261027&semanas=1&replicas=3&procura=1&faltas=0.08&azul=0.4&vermelho=0.35&verde=0.25"
                className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm"
              >
                {t("gemeo.margem30")}
              </a>
              <a
                href="/gemeo?faltas=0.25&semente=20261027&semanas=1&replicas=3&procura=1&margem=15&azul=0.4&vermelho=0.35&verde=0.25"
                className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm"
              >
                {t("gemeo.muitasFaltas")}
              </a>
            </>
          ) : (
            <BotaoInjetar
              semente={pedido.semente}
              semanas={pedido.semanas}
              procura={pedido.procura}
              faltas={pedido.probabilidadeFalta}
              margem={pedido.margemDeslocacaoMin}
              azul={pedido.pesos.azul}
              vermelho={pedido.pesos.vermelho}
              verde={pedido.pesos.verde}
            />
          )}
        </div>
      </form>

      {modo === "injetar" ? (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-xl">{t("gemeo.lotes")}</h2>
          {lotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("gemeo.semLotes")}</p>
          ) : (
            <ul className="space-y-2">
              {lotes.map((lote) => (
                <li key={lote.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <a className="underline" href={`/gemeo?modo=injetar&lote=${encodeURIComponent(lote.id)}`}>
                    {t("gemeo.loteLinha", { id: lote.id, semente: lote.semente, inicio: lote.inicio })}
                  </a>
                  <BotaoApagarLote loteId={lote.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {relatorio ? (
        <div className="space-y-6">
          <p className="rounded-xl border border-border bg-card p-4 text-sm">{relatorio.nota}</p>
          <TabelaPoliticas politicas={relatorio.politicas} />
          <div className="grid gap-4 lg:grid-cols-2">
            <BarrasPolitica
              politicas={relatorio.politicas}
              campo="utilizacao"
              titulo={t("gemeo.utilizacao")}
              explicacao={t("gemeo.utilizacaoExplicacao")}
              percentagem
            />
            <BarrasPolitica
              politicas={relatorio.politicas}
              campo="sobreReservasEvitadas"
              titulo={t("gemeo.evitadas")}
              explicacao={t("gemeo.evitadasExplicacao")}
            />
            <BarrasPolitica
              politicas={relatorio.politicas}
              campo="recusadas"
              titulo={t("gemeo.recusadas")}
              explicacao={t("gemeo.recusadasExplicacao")}
            />
            <BarrasPolitica
              politicas={relatorio.politicas}
              campo="minutosOciosos"
              titulo={t("gemeo.ocioso")}
              explicacao={t("gemeo.ociosoExplicacao")}
            />
          </div>
          <SerieDiaria serie={relatorio.serieDiaria} />
          <ComparacaoPesos relatorio={relatorio} />
          {modo === "simular" ? (
            <section className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
              <h2 className="font-heading text-xl">{t("gemeo.comoLer")}</h2>
              <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">{t("gemeo.polIndependente")}</span> {t("gemeo.polIndependenteTexto")}
                </li>
                <li>
                  <span className="font-medium text-foreground">{t("gemeo.polPartilhada")}</span> {t("gemeo.polPartilhadaTexto")}
                </li>
                <li>
                  <span className="font-medium text-foreground">{t("gemeo.polReencaixe")}</span> {t("gemeo.polReencaixeTexto")}
                </li>
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}
