import Link from "next/link";
import { Suspense } from "react";
import { ESTADOS_ORDEM, OPERADORES, eCentral } from "@/lib/rules";
import { um } from "@/lib/consulta-pagina";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { EtiquetaEstado, EtiquetaOperador } from "@/components/etiquetas";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarOrdens } from "@/server/servicos";

async function Lista({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, idioma } = await i18nPedido();
  const parametros = await searchParams;
  const ator = await exigirAtorPagina();
  const estado = um(parametros.estado);
  const data = um(parametros.data);
  const q = um(parametros.q);
  const operador = um(parametros.operador);
  const ordens = listarOrdens(ator, {
    estado: estado || undefined,
    data: data || undefined,
    q: q || undefined,
    operador: operador || undefined,
  });
  const intro =
    ordens.length === 1 ? t("ordens.uma") : t("ordens.varias", { n: ordens.length });
  const perfil =
    ator.papel === "despachante" ? t("ordens.soOperador") : ator.papel === "tecnico" ? t("ordens.soEquipa") : t("ordens.centralVe");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl">{t("ordens.titulo")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {intro} {perfil}
          </p>
        </div>
        {ator.papel === "tecnico" ? null : (
          <Link href="/ordens/nova" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
            {t("painel.novaOrdem")}
          </Link>
        )}
      </div>
      <form className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4" action="/ordens">
        <label className="space-y-1 text-sm">
          <span>{t("comum.estado")}</span>
          <select name="estado" defaultValue={estado} className="h-9 w-full rounded-lg border border-input bg-background px-2">
            <option value="">{t("comum.todos")}</option>
            {ESTADOS_ORDEM.map((item) => (
              <option key={item} value={item}>
                {t(`estado.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>{t("comum.data")}</span>
          <input name="data" type="date" defaultValue={data} className="h-9 w-full rounded-lg border border-input bg-background px-2" />
        </label>
        {eCentral(ator) ? (
          <label className="space-y-1 text-sm">
            <span>{t("comum.operador")}</span>
            <select name="operador" defaultValue={operador} className="h-9 w-full rounded-lg border border-input bg-background px-2">
              <option value="">{t("comum.todos")}</option>
              {OPERADORES.map((item) => (
                <option key={item} value={item}>
                  {t(`operador.${item}`)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="space-y-1 text-sm">
          <span>{t("comum.pesquisa")}</span>
          <input name="q" defaultValue={q} placeholder={t("ordens.placeholder")} className="h-9 w-full rounded-lg border border-input bg-background px-2" />
        </label>
        <div className="md:col-span-4">
          <button type="submit" className="h-9 rounded-lg border border-border px-3 text-sm">
            {t("comum.filtrar")}
          </button>
        </div>
      </form>
      {ordens.length === 0 ? (
        <EstadoVazio
          titulo={t("ordens.vazioTitulo")}
          detalhe={t("ordens.vazioDetalhe")}
          accao={
            ator.papel === "tecnico" ? null : (
              <Link href="/ordens/nova" className="text-sm underline">
                {t("ordens.criar")}
              </Link>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {ordens.map((ordem) => (
            <li key={ordem.id}>
              <Link href={`/ordens/${ordem.id}`} className="grid gap-1 px-4 py-3 hover:bg-muted md:grid-cols-[8rem_1fr_auto]">
                <span className="font-medium">{ordem.referencia}</span>
                <span className="text-sm">
                  {ordem.clienteNome} · {ordem.morada}
                  <span className="mt-1 block text-muted-foreground">
                    {formatarDataLocale(ordem.data, idioma)} · {ordem.janelaInicio}–{ordem.janelaFim}
                    {ordem.equipaNome ? ` · ${ordem.equipaNome}` : ""}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <EtiquetaOperador id={ordem.operadorId} />
                  <EtiquetaEstado estado={ordem.estado} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Lista searchParams={searchParams} />
    </Suspense>
  );
}
