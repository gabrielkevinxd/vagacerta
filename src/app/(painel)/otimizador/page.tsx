import { Suspense } from "react";
import { DATA_DEMONSTRACAO } from "@/lib/demonstracao";
import { um } from "@/lib/consulta-pagina";
import type { PlanoVista } from "@/lib/rules/agenda";
import type { PedidoRealocacao } from "@/lib/rules/reencaixe";
import { eCentral, eDataIso } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { Alerta } from "@/components/layout/alerta";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { PlanoComparacao } from "@/components/plano-comparacao";
import { SemAcesso } from "@/components/sem-acesso";
import { traduzirMensagem, traduzirPlanoVista } from "@/lib/i18n/motor";
import { ErroHttp } from "@/server/erros";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarEquipas, listarOrdens, previsualizar } from "@/server/servicos";
import { confirmarPlanoAcao } from "./accoes";

const campo = "h-8 w-full rounded-md border border-input bg-background px-2.5 text-[13px]/5";
const botao =
  "inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-[13px]/5 font-medium text-primary-foreground transition-colors hover:bg-primary/90";

type Modo = "encaixar" | "cancelar" | "falta";

function modoDe(valor: string, central: boolean): Modo {
  if (valor === "cancelar") return "cancelar";
  if (valor === "falta" && central) return "falta";
  return "encaixar";
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, m } = await i18nPedido();
  const ator = await exigirAtorPagina();
  const consulta = await searchParams;
  const pedida = um(consulta.data);
  const data = eDataIso(pedida) ? pedida : DATA_DEMONSTRACAO;
  const central = eCentral(ator);
  const confirmado = um(consulta.confirmado) === "1";
  const erroConsulta = um(consulta.erro);

  if (ator.papel === "tecnico") {
    return (
      <SemAcesso
        tituloPagina={t("reencaixe.titulo")}
        titulo={t("acesso.semAcesso")}
        detalhe={t("acesso.soCentralArea")}
        accao={t("acesso.voltarPainel")}
      />
    );
  }

  const espera = listarOrdens(ator, { estado: "em_espera", data });
  const agendadas = listarOrdens(ator, { estado: "agendada", data });
  const equipas = listarEquipas(ator);
  const modo = modoDe(um(consulta.modo), central);
  const ordemPedida = um(consulta.ordemId);
  const ordemId =
    ordemPedida || (modo === "cancelar" ? (agendadas[0]?.id ?? "") : (espera[0]?.id ?? agendadas[0]?.id ?? ""));
  const equipaId = um(consulta.equipaId) || equipas[0]?.id || "";
  const motivo = um(consulta.motivo);
  const trocaMarcada = central && (um(consulta.troca) === "1" || um(consulta.prever) !== "1");
  const prever = um(consulta.prever) === "1";

  let plano: PlanoVista | null = null;
  let pedido: PedidoRealocacao | null = null;
  let aviso: string | null = erroConsulta || null;

  if (prever && !aviso) {
    if (um(consulta.modo) === "falta" && !central) {
      aviso = t("reencaixe.soCentralFalta");
    } else if (modo === "falta" && !equipaId) {
      aviso = t("reencaixe.escolhaEquipa");
    } else if (modo !== "falta" && !ordemId) {
      aviso = t("reencaixe.escolhaOrdem");
    } else if (modo === "cancelar" && motivo.trim().length < 3) {
      aviso = t("reencaixe.motivoCurto");
    } else {
      pedido =
        modo === "falta"
          ? { equipaEmFalta: equipaId, data, permitirTroca: trocaMarcada }
          : modo === "cancelar"
            ? { cancelarId: ordemId, data, motivo: motivo.trim() }
            : { encaixarId: ordemId, data, permitirTroca: central && trocaMarcada };
      try {
        plano = traduzirPlanoVista(m, previsualizar(ator, pedido));
      } catch (erro) {
        aviso = erro instanceof ErroHttp ? traduzirMensagem(m, erro.message, erro.codigo) : t("comum.pedidoFalhou");
        pedido = null;
      }
    }
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo={t("reencaixe.titulo")} descricao={t("reencaixe.intro")} />

      {confirmado ? <Alerta tom="sucesso">{t("reencaixe.aplicado")}</Alerta> : null}

      <form action="/otimizador" className="superficie space-y-4 p-4">
        <input type="hidden" name="prever" value="1" />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-[13px]/5" htmlFor="data">
            <span className="font-medium">{t("comum.dia")}</span>
            <input id="data" name="data" type="date" defaultValue={data} className={campo} />
          </label>
          <label className="space-y-1.5 text-[13px]/5" htmlFor="modo">
            <span className="font-medium">{t("reencaixe.pedido")}</span>
            <select id="modo" name="modo" defaultValue={modo} className={campo}>
              <option value="encaixar">{t("reencaixe.modoEncaixarFila")}</option>
              <option value="cancelar">{t("reencaixe.modoCancelarFila")}</option>
              {central ? <option value="falta">{t("reencaixe.modoFaltaEquipa")}</option> : null}
            </select>
          </label>
          <label className="space-y-1.5 text-[13px]/5" htmlFor="ordemId">
            <span className="font-medium">{t("reencaixe.ordem")}</span>
            <select id="ordemId" name="ordemId" defaultValue={ordemId} className={campo}>
              {espera.length === 0 && agendadas.length === 0 ? <option value="">{t("comum.nadaNesteDia")}</option> : null}
              {espera.length > 0 ? (
                <optgroup label={t("reencaixe.filaEspera")}>
                  {espera.map((ordem) => (
                    <option key={ordem.id} value={ordem.id}>
                      {ordem.referencia} · {ordem.clienteNome} · {ordem.area}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {agendadas.length > 0 ? (
                <optgroup label={t("reencaixe.agendadas")}>
                  {agendadas.map((ordem) => (
                    <option key={ordem.id} value={ordem.id}>
                      {ordem.referencia} · {ordem.clienteNome}
                      {ordem.equipaNome ? ` · ${ordem.equipaNome}` : ""}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          {central ? (
            <label className="space-y-1.5 text-[13px]/5" htmlFor="equipaId">
              <span className="font-medium">{t("reencaixe.equipaFalta")}</span>
              <select id="equipaId" name="equipaId" defaultValue={equipaId} className={campo}>
                {equipas.map((equipa) => (
                  <option key={equipa.id} value={equipa.id}>
                    {equipa.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {central ? (
          <label className="flex items-center gap-2 text-[13px]/5" htmlFor="troca">
            <input id="troca" name="troca" type="checkbox" value="1" defaultChecked={trocaMarcada} />
            {t("reencaixe.permitirTroca")}
          </label>
        ) : (
          <p className="text-[13px]/5 text-muted-foreground">{t("reencaixe.despachoSoProprio")}</p>
        )}
        <label className="block space-y-1.5 text-[13px]/5" htmlFor="motivo">
          <span className="font-medium">{t("reencaixe.motivoCancelamento")}</span>
          <textarea id="motivo" name="motivo" defaultValue={motivo} rows={3} className="w-full rounded-lg border border-input bg-card px-2.5 py-2 text-[13px]/5" />
          <span className="block text-muted-foreground">{t("reencaixe.motivoObrigatorio")}</span>
        </label>
        <button type="submit" className={botao}>
          {t("comum.previsualizar")}
        </button>
      </form>

      {aviso ? (
        <p role="alert" className="text-[13px]/5 text-destructive">
          {aviso}
        </p>
      ) : null}

      {plano ? (
        <div className="space-y-3">
          <PlanoComparacao plano={plano} />
          {plano.viavel && pedido ? (
            <form action={confirmarPlanoAcao}>
              <input type="hidden" name="pedido" value={JSON.stringify(pedido)} />
              <input type="hidden" name="selo" value={plano.selo} />
              <button type="submit" className={botao}>
                {t("comum.confirmarPlano")}
              </button>
            </form>
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
