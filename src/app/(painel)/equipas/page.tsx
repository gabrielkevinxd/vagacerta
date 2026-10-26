import Link from "next/link";
import { Suspense } from "react";
import { hojeLisboa } from "@/lib/rules";
import { Carregamento } from "@/components/carregamento";
import { EstadoVazio } from "@/components/estado-vazio";
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
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl">{t("equipas.titulo")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("equipas.intro")}</p>
        <div className="mt-3">
          <LegendaOperadores compacta />
        </div>
      </div>
      {equipas.length === 0 ? (
        <EstadoVazio titulo={t("equipas.semVisiveisTitulo")} detalhe={t("equipas.semVisiveisDetalhe")} />
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {equipas.map((equipa) => (
          <li key={equipa.id}>
            <Link href={`/equipas/${equipa.id}?data=${hoje}`} className="block rounded-xl border border-border bg-card p-4 hover:bg-muted">
              <p className="font-heading text-xl">{equipa.nome}</p>
              <p className="text-sm text-muted-foreground">
                {equipa.codigo} · {equipa.base} · {equipa.cco}
              </p>
              <p className="mt-2 text-sm">
                {equipa.zona ? `${equipa.zona.codigo} ${equipa.zona.nome}` : t("equipas.semZona")} ·{" "}
                {equipa.ativa ? t("comum.ativa") : t("comum.inativa")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{equipa.areas.join(", ")}</p>
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
