import Link from "next/link";
import { Suspense } from "react";
import { eCentral } from "@/lib/rules";
import { um } from "@/lib/consulta-pagina";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { FiltrosChips } from "@/components/ordens/filtros-chips";
import { PainelDetalheOrdem } from "@/components/ordens/painel-detalhe";
import { TabelaOrdens } from "@/components/ordens/tabela-ordens";
import { Button } from "@/components/ui/button";
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
  const ordemAberta = um(parametros.ordem);
  const ordens = listarOrdens(ator, {
    estado: estado || undefined,
    data: data || undefined,
    q: q || undefined,
    operador: operador || undefined,
  });
  const intro = ordens.length === 1 ? t("ordens.uma") : t("ordens.varias", { n: ordens.length });
  const perfil =
    ator.papel === "despachante" ? t("ordens.soOperador") : ator.papel === "tecnico" ? t("ordens.soEquipa") : t("ordens.centralVe");
  const aberta = ordens.find((o) => o.id === ordemAberta) ?? null;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo={
          <>
            {t("ordens.titulo")}{" "}
            <span className="text-sm font-normal text-muted-foreground tabular-nums">{ordens.length}</span>
          </>
        }
        descricao={`${intro} ${perfil}`}
        accoes={
          ator.papel === "tecnico" ? null : (
            <Button asChild size="sm">
              <Link href="/ordens/nova">{t("painel.novaOrdem")}</Link>
            </Button>
          )
        }
      />
      <FiltrosChips
        estado={estado}
        data={data}
        q={q}
        operador={operador}
        mostrarOperador={eCentral(ator)}
      />
      {ordens.length === 0 ? (
        <EstadoVazio
          titulo={t("ordens.vazioTitulo")}
          detalhe={t("ordens.vazioDetalhe")}
          accao={
            ator.papel === "tecnico" ? null : (
              <Button asChild size="sm">
                <Link href="/ordens/nova">{t("ordens.criar")}</Link>
              </Button>
            )
          }
        />
      ) : (
        <TabelaOrdens
          idioma={idioma}
          ordemAberta={ordemAberta || undefined}
          ordens={ordens.map((ordem) => ({
            id: ordem.id,
            referencia: ordem.referencia,
            clienteNome: ordem.clienteNome,
            morada: ordem.morada,
            data: ordem.data,
            janelaInicio: ordem.janelaInicio,
            janelaFim: ordem.janelaFim,
            equipaNome: ordem.equipaNome,
            operadorId: ordem.operadorId,
            estado: ordem.estado,
          }))}
        />
      )}
      <PainelDetalheOrdem
        ordem={
          aberta
            ? {
                id: aberta.id,
                referencia: aberta.referencia,
                clienteNome: aberta.clienteNome,
                morada: aberta.morada,
                data: aberta.data,
                janelaInicio: aberta.janelaInicio,
                janelaFim: aberta.janelaFim,
                equipaNome: aberta.equipaNome,
                operadorId: aberta.operadorId,
                estado: aberta.estado,
              }
            : null
        }
      />
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
