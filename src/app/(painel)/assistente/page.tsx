import { Suspense } from "react";
import { PainelAssistenteCliente } from "@/components/assistente/painel";
import { Carregamento } from "@/components/carregamento";
import { SemAcesso } from "@/components/sem-acesso";
import { hojeLisboa } from "@/lib/rules";
import { painelAssistente } from "@/server/assistente";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  if (ator.papel === "tecnico") {
    return (
      <SemAcesso
        tituloPagina={t("assistente.titulo")}
        titulo={t("acesso.semAcesso")}
        detalhe={t("acesso.soNaoTecnico")}
        accao={t("acesso.voltarPainel")}
      />
    );
  }
  const painel = painelAssistente(ator, hojeLisboa());
  return <PainelAssistenteCliente inicial={painel} />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Carregamento />}>
      <Conteudo />
    </Suspense>
  );
}
