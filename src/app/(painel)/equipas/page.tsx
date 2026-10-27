import Link from "next/link";
import { Suspense } from "react";
import { um } from "@/lib/consulta-pagina";
import { hojeLisboa, OPERADORES, type OperadorId } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { EtiquetaOperador } from "@/components/etiquetas";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { LegendaOperadores } from "@/components/legenda-operadores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarEquipas } from "@/server/servicos";

const POR_PAGINA = 24;

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  const consulta = await searchParams;
  const q = (um(consulta.q) ?? "").trim().toLowerCase();
  const operadorFiltro = um(consulta.operador);
  const operador = (OPERADORES as readonly string[]).includes(operadorFiltro ?? "")
    ? (operadorFiltro as OperadorId)
    : null;
  const paginaPedida = Number(um(consulta.pagina) ?? "1");
  const equipas = listarEquipas(ator).filter((equipa) => {
    if (operador && !equipa.operadoresServidos.includes(operador)) return false;
    if (!q) return true;
    const hay = `${equipa.nome} ${equipa.codigo} ${equipa.base} ${equipa.areas.join(" ")} ${equipa.zona?.nome ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
  const totalPaginas = Math.max(1, Math.ceil(equipas.length / POR_PAGINA));
  const pagina = Number.isFinite(paginaPedida) ? Math.min(Math.max(1, Math.floor(paginaPedida)), totalPaginas) : 1;
  const fatia = equipas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const hoje = hojeLisboa();
  const baseQuery = (extra: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (operador) params.set("operador", operador);
    for (const [chave, valor] of Object.entries(extra)) {
      if (valor) params.set(chave, valor);
      else params.delete(chave);
    }
    const texto = params.toString();
    return texto ? `/equipas?${texto}` : "/equipas";
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo={t("equipas.titulo")}
        descricao={
          <>
            <p>{t("equipas.intro")}</p>
            <div className="mt-3">
              <LegendaOperadores compacta apenas={ator.papel === "despachante" ? ator.operadorId : null} />
            </div>
          </>
        }
      />
      <form className="flex flex-wrap items-end gap-3" action="/equipas" method="get">
        <div className="space-y-1.5">
          <label htmlFor="q" className="text-[13px]/5 text-muted-foreground">
            {t("equipas.pesquisar")}
          </label>
          <Input id="q" name="q" defaultValue={q} className="h-8 w-56" />
        </div>
        <div className="space-y-1.5">
          <span className="text-[13px]/5 text-muted-foreground">{t("equipas.filtrarOperador")}</span>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={baseQuery({ operador: null, pagina: null, q: q || null })}
              className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[13px]/5 ${!operador ? "border-primary bg-muted" : "border-border bg-card"}`}
            >
              {t("equipas.filtrarTodos")}
            </Link>
            {OPERADORES.map((id) => (
              <Link
                key={id}
                href={baseQuery({ operador: id, pagina: null, q: q || null })}
                className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[13px]/5 ${operador === id ? "border-primary bg-muted" : "border-border bg-card"}`}
              >
                {t(`operador.${id}`)}
              </Link>
            ))}
          </div>
        </div>
        <Button type="submit" variant="outline" className="h-8">
          {t("comum.ver")}
        </Button>
      </form>
      {fatia.length === 0 ? (
        <EstadoVazio
          titulo={equipas.length === 0 && !q && !operador ? t("equipas.semVisiveisTitulo") : t("equipas.semResultados")}
          detalhe={equipas.length === 0 && !q && !operador ? t("equipas.semVisiveisDetalhe") : t("equipas.semResultados")}
        />
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {fatia.map((equipa) => (
          <li key={equipa.id}>
            <Link
              href={`/equipas/${equipa.id}?data=${hoje}`}
              className="superficie block p-4 transition-colors hover:bg-muted/60"
            >
              <p className="text-base font-semibold tracking-tight">{equipa.nome}</p>
              <p className="mt-0.5 text-[13px]/5 text-muted-foreground">
                {equipa.codigo} · {equipa.base} · {equipa.cco}
              </p>
              <p className="mt-3 text-[13px]/5">
                {equipa.zona ? `${equipa.zona.codigo} ${equipa.zona.nome}` : t("equipas.semZona")} ·{" "}
                <span className={equipa.ativa ? "text-[color:var(--success)]" : "text-muted-foreground"}>
                  {equipa.ativa ? t("comum.ativa") : t("comum.inativa")}
                </span>
              </p>
              <p className="mt-1 text-[13px]/5 text-muted-foreground">{equipa.areas.join(", ")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {equipa.operadoresServidos.map((id) => (
                  <EtiquetaOperador key={id} id={id} nome={t(`operador.${id}`)} />
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {totalPaginas > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]/5">
          <p>{t("equipas.paginaDe", { pagina, total: totalPaginas })}</p>
          <div className="flex gap-2">
            {pagina > 1 ? (
              <Link href={baseQuery({ pagina: String(pagina - 1), q: q || null, operador })} className="underline">
                {t("equipas.anterior")}
              </Link>
            ) : null}
            {pagina < totalPaginas ? (
              <Link href={baseQuery({ pagina: String(pagina + 1), q: q || null, operador })} className="underline">
                {t("equipas.seguinte")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Pagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<Carregamento />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}
