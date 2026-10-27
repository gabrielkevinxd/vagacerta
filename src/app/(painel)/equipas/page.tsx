import Link from "next/link";
import { Suspense } from "react";
import { hojeLisboa } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { LegendaOperadores } from "@/components/legenda-operadores";
import { i18nPedido } from "@/server/idioma";
import { exigirAtorPagina } from "@/server/sessao";
import { listarEquipas } from "@/server/servicos";

async function Conteudo() {
  const { t } = await i18nPedido();
  const ator = await exigirAtorPagina();
  const equipas = listarEquipas(ator);
  const hoje = hojeLisboa();
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
      {equipas.length === 0 ? (
        <EstadoVazio titulo={t("equipas.semVisiveisTitulo")} detalhe={t("equipas.semVisiveisDetalhe")} />
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {equipas.map((equipa) => (
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
              <p className="mt-2 text-xs text-muted-foreground">
                {equipa.competencias.map((linha) => t(`operador.${linha.operadorId}`)).join(" · ") || t("equipas.semCompetencias")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
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
