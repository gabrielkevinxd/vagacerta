import { Suspense } from "react";
import { um } from "@/lib/consulta-pagina";
import { JANELAS_INICIO, OPERADORES, type OperadorId } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { FormularioOrdem } from "@/components/formulario-ordem";
import { SemAcesso } from "@/components/sem-acesso";
import { i18nPedido } from "@/server/idioma";
import { diaDemonstracaoAtual } from "@/server/db";
import { exigirAtorPagina } from "@/server/sessao";
import { listarEquipas, listarZonas } from "@/server/servicos";

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (ator.papel === "tecnico") {
    return (
      <SemAcesso
        tituloPagina={t("ordens.novaTitulo")}
        titulo={t("acesso.semAcesso")}
        detalhe={t("acesso.soCentralArea")}
        accao={t("acesso.voltarPainel")}
      />
    );
  }
  const consulta = await searchParams;
  const zonas = listarZonas();
  const equipaId = um(consulta.equipaId) ?? null;
  const equipaNome = equipaId ? (listarEquipas(ator).find((e) => e.id === equipaId)?.nome ?? null) : null;
  const area = um(consulta.area) ?? undefined;
  const zonaId = um(consulta.zonaId) ?? undefined;
  const inicio = um(consulta.inicio) ?? undefined;
  const fim = um(consulta.fim) ?? undefined;
  const operadorQuery = um(consulta.operador);
  const operadorInicial =
    ator.papel === "despachante"
      ? undefined
      : (OPERADORES as readonly string[]).includes(operadorQuery ?? "")
        ? (operadorQuery as OperadorId)
        : undefined;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{t("ordens.novaTitulo")}</h1>
        <p className="mt-1 max-w-2xl text-[13px]/5 text-muted-foreground">{t("ordens.novaAjuda")}</p>
      </div>
      <FormularioOrdem
        operadorFixo={ator.papel === "despachante" ? ator.operadorId : null}
        zonas={zonas}
        janelas={JANELAS_INICIO}
        dataInicial={um(consulta.data) ?? diaDemonstracaoAtual()}
        equipaIdInicial={equipaId}
        equipaNomeInicial={equipaNome}
        areaInicial={area}
        zonaIdInicial={zonaId}
        janelaInicial={inicio && fim ? { inicio, fim } : undefined}
        operadorInicial={operadorInicial}
      />
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
