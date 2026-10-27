import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { um } from "@/lib/consulta-pagina";
import { hojeLisboa, OPERADORES, type OperadorId } from "@/lib/rules";
import { distritosComCobertura, municipiosDoDistrito, nomesAreasCobertura } from "@/lib/zonas/catalogo";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { FiltrosZona } from "@/components/filtros-zona";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { LegendaOperadores } from "@/components/legenda-operadores";
import { EquipasFolhaSheet } from "@/components/equipas-folha-sheet";
import { Button } from "@/components/ui/button";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarEquipas } from "@/server/servicos";
import { cn } from "@/lib/utils";

const POR_PAGINA = 24;

function ponto(operadorId: OperadorId) {
  const cor =
    operadorId === "azul" ? "bg-[color:var(--op-azul)]" : operadorId === "vermelho" ? "bg-[color:var(--op-vermelho)]" : "bg-[color:var(--op-verde)]";
  return <span className={cn("inline-block size-2.5 rounded-full", cor)} aria-hidden />;
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  const consulta = await searchParams;
  const qRaw = um(consulta.q) ?? "";
  const q = qRaw.trim().toLowerCase();
  const operadorFiltro = um(consulta.operador);
  const operador = (OPERADORES as readonly string[]).includes(operadorFiltro ?? "")
    ? (operadorFiltro as OperadorId)
    : null;
  const distrito = um(consulta.distrito) ?? "";
  const municipio = um(consulta.municipio) ?? "";
  const paginaPedida = Number(um(consulta.pagina) ?? "1");
  const abertaId = um(consulta.equipa) ?? "";
  const distritos = distritosComCobertura();
  const municipios = distrito ? municipiosDoDistrito(distrito).map((m) => m.nome) : nomesAreasCobertura();
  const dataRef = um(consulta.data) && um(consulta.data)!.match(/^\d{4}-\d{2}-\d{2}$/) ? um(consulta.data)! : undefined;

  const equipas = listarEquipas(ator, dataRef).filter((equipa) => {
    if (operador && !equipa.operadoresServidos.includes(operador)) return false;
    if (distrito && equipa.distrito !== distrito) return false;
    if (municipio) {
      const cobre = equipa.base === municipio || equipa.areas.includes(municipio) || equipa.zona?.nome === municipio;
      if (!cobre) return false;
    }
    if (!q) return true;
    const hay = `${equipa.nome} ${equipa.codigo} ${equipa.base} ${equipa.distrito ?? ""} ${equipa.areas.join(" ")} ${equipa.zona?.nome ?? ""}`
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
    const needle = q.normalize("NFD").replace(/\p{M}/gu, "");
    return hay.includes(needle);
  });
  const totalPaginas = Math.max(1, Math.ceil(equipas.length / POR_PAGINA));
  const pagina = Number.isFinite(paginaPedida) ? Math.min(Math.max(1, Math.floor(paginaPedida)), totalPaginas) : 1;
  const fatia = equipas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const de = equipas.length === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const ate = Math.min(pagina * POR_PAGINA, equipas.length);
  const hoje = hojeLisboa();
  const aberta = abertaId
    ? (equipas.find((e) => e.id === abertaId) ?? fatia.find((e) => e.id === abertaId) ?? null)
    : null;

  const baseQuery = (extra: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (qRaw) params.set("q", qRaw);
    if (operador) params.set("operador", operador);
    if (distrito) params.set("distrito", distrito);
    if (municipio) params.set("municipio", municipio);
    if (pagina > 1) params.set("pagina", String(pagina));
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
        titulo={t("equipas.contagemCabecalho", { n: equipas.length })}
        descricao={
          <>
            <p>{t("equipas.intro")}</p>
            <div className="mt-3">
              <LegendaOperadores compacta apenas={null} />
            </div>
          </>
        }
      />
      <FiltrosZona
        caminho="/equipas"
        q={qRaw}
        distrito={distrito}
        municipio={municipio}
        operador={operador}
        distritos={distritos}
        municipios={municipios}
        mostrarOperador
        mostrarPesquisa
      />
      {fatia.length === 0 ? (
        <EstadoVazio
          titulo={
            equipas.length === 0 && !q && !operador && !distrito && !municipio
              ? t("equipas.semVisiveisTitulo")
              : t("comando.semResultados")
          }
          detalhe={
            equipas.length === 0 && !q && !operador && !distrito && !municipio
              ? t("equipas.semVisiveisDetalhe")
              : t("equipas.semResultados")
          }
        />
      ) : (
        <div className="overflow-x-auto superficie">
          <table className="w-full min-w-[64rem] border-collapse text-left text-[13px]/5">
            <thead className="border-b border-border text-muted-foreground">
              <tr className="h-9">
                <th className="px-3 font-medium">{t("equipas.colunaCodigo")}</th>
                <th className="px-3 font-medium">{t("equipas.colunaEquipa")}</th>
                <th className="px-3 font-medium">{t("equipas.colunaBase")}</th>
                <th className="px-3 font-medium">{t("equipas.colunaDistrito")}</th>
                <th className="px-3 font-medium">{t("equipas.colunaZona")}</th>
                <th className="px-3 font-medium">{t("equipas.colunaOperadores")}</th>
                <th className="px-3 font-medium">{t("equipas.colunaEstado")}</th>
                <th className="px-3 text-right font-medium tabular-nums">{t("equipas.colunaTecnicos")}</th>
              </tr>
            </thead>
            <tbody>
              {fatia.map((equipa) => (
                <tr key={equipa.id} className="h-9 border-b border-border/70 hover:bg-muted/50">
                  <td className="px-3 font-mono text-[12px]">{equipa.codigo}</td>
                  <td className="px-3">
                    <Link href={baseQuery({ equipa: equipa.id })} className="font-medium underline-offset-2 hover:underline">
                      {equipa.nome}
                    </Link>
                  </td>
                  <td className="px-3">{equipa.base}</td>
                  <td className="px-3">{equipa.distrito ?? "—"}</td>
                  <td className="px-3">
                    {equipa.zona ? (
                      `${equipa.zona.codigo} · ${equipa.zona.nome}`
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[color:var(--warning)]">
                        <TriangleAlert className="size-3.5" strokeWidth={1.75} aria-hidden />
                        {t("equipas.semZonaAviso")}
                      </span>
                    )}
                  </td>
                  <td className="px-3">
                    <span
                      role="img"
                      className="inline-flex items-center gap-1.5"
                      aria-label={OPERADORES.filter((id) => equipa.operadoresServidos.includes(id))
                        .map((id) => t(`operador.${id}`))
                        .join(", ")}
                    >
                      {OPERADORES.filter((id) => equipa.operadoresServidos.includes(id)).map((id) => (
                        <span key={id}>{ponto(id)}</span>
                      ))}
                    </span>
                  </td>
                  <td className="px-3">
                    <span className={equipa.ativa ? "text-[color:var(--success)]" : "text-muted-foreground"}>
                      {equipa.ativa ? t("comum.ativa") : t("comum.inativa")}
                    </span>
                  </td>
                  <td className="px-3 text-right tabular-nums">{equipa.tecnicos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {equipas.length > 0 ? (
        <nav aria-label={t("equipas.paginacaoAria")} className="flex flex-wrap items-center justify-between gap-3 text-[13px]/5">
          <p className="tabular-nums">{t("equipas.paginaIntervalo", { de, ate, total: equipas.length })}</p>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="h-8" disabled={pagina <= 1}>
              <Link
                href={pagina <= 1 ? baseQuery({}) : baseQuery({ pagina: String(pagina - 1), equipa: null })}
                aria-disabled={pagina <= 1}
                className={pagina <= 1 ? "pointer-events-none opacity-50" : undefined}
              >
                <ChevronLeft className="size-4" strokeWidth={1.75} />
                {t("equipas.anterior")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-8" disabled={pagina >= totalPaginas}>
              <Link
                href={pagina >= totalPaginas ? baseQuery({}) : baseQuery({ pagina: String(pagina + 1), equipa: null })}
                aria-disabled={pagina >= totalPaginas}
                className={pagina >= totalPaginas ? "pointer-events-none opacity-50" : undefined}
              >
                {t("equipas.seguinte")}
                <ChevronRight className="size-4" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </nav>
      ) : null}

      <EquipasFolhaSheet
        aberta={Boolean(aberta)}
        fecharHref={baseQuery({ equipa: null })}
        fichaHref={aberta ? `/equipas/${aberta.id}?data=${hoje}` : "/equipas"}
        equipa={aberta}
      />
    </div>
  );
}

export default function Pagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<Carregamento variante="tabela" />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}
