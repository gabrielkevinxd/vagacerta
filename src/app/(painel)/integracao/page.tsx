import { Suspense } from "react";
import { Carregamento } from "@/components/carregamento";
import { ConsolaIntegracao } from "@/components/integracao/consola";
import { XAI_MODELO_OMISSAO, modeloXai } from "@/lib/ofsc/xai";
import { i18nPedido } from "@/server/idioma";

async function Conteudo() {
  const { t } = await i18nPedido();
  const modelo = modeloXai() || XAI_MODELO_OMISSAO;
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl">{t("integracao.titulo")}</h1>
      <ConsolaIntegracao
        textos={{
          corpo: t("integracao.corpo"),
          escolherOperador: t("integracao.escolherOperador"),
          pedido: t("integracao.pedido"),
          exemplo: t("integracao.exemplo"),
          atalho: t("integracao.atalho"),
          aplicarAtalho: t("integracao.aplicarAtalho"),
          enviar: t("integracao.enviar"),
          aEnviar: t("integracao.aEnviar"),
          confirmar: t("integracao.confirmar"),
          modoIa: t("integracao.modoIa", { modelo }),
          modoSemIa: t("integracao.modoSemIa"),
          colunaOrigem: t("integracao.colunaOrigem"),
          colunaVaga: t("integracao.colunaVaga"),
          colunaOutros: t("integracao.colunaOutros"),
          consola: t("integracao.consola"),
          cenarios: t("integracao.cenarios"),
          vazio: t("integracao.vazio"),
          retries: t("integracao.retries"),
          grelha: t("integracao.grelha"),
          grelhaVazia: t("integracao.grelhaVazia"),
          camposConfirmar: t("integracao.camposConfirmar"),
          emFalta: t("integracao.emFalta"),
          operadores: {
            azul: t("operador.azul"),
            vermelho: t("operador.vermelho"),
            verde: t("operador.verde"),
          },
          tipos: {
            instalacao: t("integracao.tipos.instalacao"),
            manutencao: t("integracao.tipos.manutencao"),
            adicional: t("integracao.tipos.adicional"),
          },
          campos: {
            zona: t("integracao.campos.zona"),
            data: t("integracao.campos.data"),
            janelaInicio: t("integracao.campos.janelaInicio"),
            janelaFim: t("integracao.campos.janelaFim"),
            tipoIntervencao: t("integracao.campos.tipoIntervencao"),
            resourceId: t("integracao.campos.resourceId"),
            tecnicoId: t("integracao.campos.tecnicoId"),
            apptNumber: t("integracao.campos.apptNumber"),
            customerName: t("integracao.campos.customerName"),
            streetAddress: t("integracao.campos.streetAddress"),
            city: t("integracao.campos.city"),
            postalCode: t("integracao.campos.postalCode"),
            latitude: t("integracao.campos.latitude"),
            longitude: t("integracao.campos.longitude"),
          },
          cenariosRotulo: {
            vaga_livre: t("integracao.cenario.vaga_livre"),
            capacidade_esgotada: t("integracao.cenario.capacidade_esgotada"),
            zona_fechada: t("integracao.cenario.zona_fechada"),
            fora_da_janela: t("integracao.cenario.fora_da_janela"),
            tecnico_indisponivel: t("integracao.cenario.tecnico_indisponivel"),
            reagendamento: t("integracao.cenario.reagendamento"),
            cancelamento_reencaixe: t("integracao.cenario.cancelamento_reencaixe"),
            falta_equipa: t("integracao.cenario.falta_equipa"),
            dois_operadores: t("integracao.cenario.dois_operadores"),
            evento_duplicado: t("integracao.cenario.evento_duplicado"),
            ofsc_em_baixo: t("integracao.cenario.ofsc_em_baixo"),
          },
        }}
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
