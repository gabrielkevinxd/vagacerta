import Link from "next/link";
import { Suspense } from "react";
import { proximoDiaUtil } from "@/lib/demonstracao-dia";
import { hojeLisboa, JANELAS_INICIO } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { FormularioOrdem } from "@/components/formulario-ordem";
import { diaDemonstracaoAtual } from "@/server/db";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarZonas, zonasPorArea } from "@/server/servicos";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (ator.papel === "tecnico") {
    return (
      <div className="space-y-3">
        <h1 className="font-heading text-3xl">{t("ordens.novaTitulo")}</h1>
        <p>{t("ordens.tecnicoNaoCria")}</p>
        <Link href="/ordens" className="text-sm underline">
          {t("ordens.voltarLista")}
        </Link>
      </div>
    );
  }
  const zonas = listarZonas();
  // Dia por omissão: o dia rico da demonstração; se já passou, o próximo dia útil (um despachante não marca no passado).
  const dataInicial = proximoDiaUtil([diaDemonstracaoAtual(), hojeLisboa()].sort().pop()!);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl">{t("ordens.novaTitulo")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("ordens.novaAjuda")}</p>
      </div>
      <FormularioOrdem
        operadorFixo={ator.papel === "despachante" ? ator.operadorId : null}
        zonas={zonas}
        zonasPorArea={zonasPorArea()}
        janelas={JANELAS_INICIO}
        dataInicial={dataInicial}
      />
    </div>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<Carregamento />}>
      <Conteudo />
    </Suspense>
  );
}
