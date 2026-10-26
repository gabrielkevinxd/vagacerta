"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AREAS } from "@/lib/rules/areas";
import { useT } from "@/components/idioma/provedor";
import { CATEGORIAS, OPERADORES, PRIORIDADES, TECNOLOGIAS, type OperadorId } from "@/lib/rules/tipos";
import type { PublicacaoVagas } from "@/lib/rules/vagas";
import { enviar } from "@/lib/cliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const campo = "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export interface JanelaOpcao {
  operadorId: string;
  categoria: string;
  codigo: string;
  inicio: string;
  fim: string;
}

export function FormularioOrdem({
  operadorFixo,
  zonas,
  janelas,
  dataInicial,
}: {
  operadorFixo: OperadorId | null;
  zonas: { id: string; codigo: string; nome: string }[];
  janelas: JanelaOpcao[];
  dataInicial: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [operadorId, setOperadorId] = useState<OperadorId>(operadorFixo ?? "azul");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("instalacao");
  const [tecnologia, setTecnologia] = useState<string>("FTTH");
  const [janela, setJanela] = useState("");
  const [area, setArea] = useState<string>(AREAS[0]);
  const [data, setData] = useState(dataInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [vagas, setVagas] = useState<PublicacaoVagas | null>(null);

  const opcoes = useMemo(
    () =>
      janelas.filter(
        (linha) => linha.operadorId === operadorId && (linha.categoria === categoria || linha.categoria === "qualquer"),
      ),
    [janelas, operadorId, categoria],
  );

  const janelaAtual = opcoes.find((linha) => `${linha.inicio}|${linha.fim}` === janela) ?? opcoes[0];

  async function submeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!janelaAtual) {
      setErro(t("ordens.semJanela"));
      return;
    }
    const dados = new FormData(evento.currentTarget);
    setAGuardar(true);
    setErro(null);
    try {
      const criada = await enviar<{ id: string }>("/api/ordens", {
        operadorId,
        referencia: String(dados.get("referencia") ?? ""),
        area,
        zonaId: String(dados.get("zonaId") ?? ""),
        categoria,
        tecnologia: operadorId === "verde" ? tecnologia : null,
        data,
        janelaInicio: janelaAtual.inicio,
        janelaFim: janelaAtual.fim,
        prioridade: String(dados.get("prioridade") ?? "media"),
        clienteNome: String(dados.get("clienteNome") ?? ""),
        clienteContacto: String(dados.get("clienteContacto") ?? ""),
        morada: String(dados.get("morada") ?? ""),
        nota: String(dados.get("nota") ?? ""),
        modo: String(dados.get("modo") ?? "agendar"),
      });
      router.push(`/ordens/${criada.id}`);
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    } finally {
      setAGuardar(false);
    }
  }

  async function consultarVagas() {
    if (!janelaAtual) return;
    setErro(null);
    const parametros = new URLSearchParams({ operadorId, data, area, categoria });
    if (operadorId === "verde") parametros.set("tecnologia", tecnologia);
    try {
      setVagas(await enviar<PublicacaoVagas>(`/api/vagas?${parametros}`, undefined, "GET"));
    } catch (falha) {
      setVagas(null);
      setErro(falha instanceof Error ? falha.message : t("comum.pedidoFalhou"));
    }
  }

  return (
    <form onSubmit={submeter} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="operador">{t("comum.operador")}</Label>
        {operadorFixo ? (
          <p id="operador" className="text-sm">
            {t(`operador.${operadorFixo}`)}
          </p>
        ) : (
          <select id="operador" className={campo} value={operadorId} onChange={(evento) => setOperadorId(evento.target.value as OperadorId)}>
            {OPERADORES.map((id) => (
              <option key={id} value={id}>
                {t(`operador.${id}`)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="referencia">{t("ordens.referencia")}</Label>
        <Input id="referencia" name="referencia" required minLength={3} placeholder="AZ-25001" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="categoria">{t("ordens.tipoServico")}</Label>
        <select id="categoria" className={campo} value={categoria} onChange={(evento) => setCategoria(evento.target.value as (typeof CATEGORIAS)[number])}>
          {CATEGORIAS.filter((item) => operadorId === "verde" || item !== "desligamento").map((item) => (
            <option key={item} value={item}>
              {t(`categoria.${item}`)}
            </option>
          ))}
        </select>
      </div>
      {operadorId === "verde" ? (
        <div className="space-y-1.5">
          <Label htmlFor="tecnologia">{t("ordens.tecnologia")}</Label>
          <select id="tecnologia" className={campo} value={tecnologia} onChange={(evento) => setTecnologia(evento.target.value)}>
            {TECNOLOGIAS.map((item) => (
              <option key={item} value={item}>
                {t(`tecnologia.${item}`)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="data">{t("comum.data")}</Label>
        <Input id="data" type="date" value={data} onChange={(evento) => setData(evento.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="janela">{t("ordens.janela")}</Label>
        <select id="janela" className={campo} value={janelaAtual ? `${janelaAtual.inicio}|${janelaAtual.fim}` : ""} onChange={(evento) => setJanela(evento.target.value)}>
          {opcoes.map((linha) => (
            <option key={`${linha.codigo}-${linha.inicio}`} value={`${linha.inicio}|${linha.fim}`}>
              {linha.codigo} {linha.inicio}–{linha.fim}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="area">{t("ordens.area")}</Label>
        <select id="area" className={campo} value={area} onChange={(evento) => setArea(evento.target.value)}>
          {AREAS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="zonaId">{t("ordens.zona")}</Label>
        <select id="zonaId" name="zonaId" className={campo} required defaultValue={zonas[0]?.id}>
          {zonas.map((zona) => (
            <option key={zona.id} value={zona.id}>
              {zona.codigo} · {zona.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="prioridade">{t("ordens.prioridade")}</Label>
        <select id="prioridade" name="prioridade" className={campo} defaultValue="media">
          {PRIORIDADES.map((item) => (
            <option key={item} value={item}>
              {t(`prioridade.${item}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="modo">{t("ordens.oQueFazer")}</Label>
        <select id="modo" name="modo" className={campo} defaultValue="agendar">
          <option value="agendar">{t("ordens.agendarJa")}</option>
          <option value="espera">{t("ordens.porFila")}</option>
          <option value="pendente">{t("ordens.deixarPendente")}</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="clienteNome">{t("ordens.cliente")}</Label>
        <Input id="clienteNome" name="clienteNome" required minLength={3} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="clienteContacto">{t("ordens.contacto")}</Label>
        <Input id="clienteContacto" name="clienteContacto" required minLength={5} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="morada">{t("ordens.morada")}</Label>
        <Input id="morada" name="morada" required minLength={5} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="nota">{t("ordens.nota")}</Label>
        <Textarea id="nota" name="nota" />
      </div>
      {erro ? (
        <p role="alert" className="text-sm text-destructive md:col-span-2">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit" disabled={aGuardar}>
          {aGuardar ? t("comum.aGuardar") : t("ordens.guardarOrdem")}
        </Button>
        <Button type="button" variant="outline" onClick={consultarVagas}>
          {t("ordens.verVagas")}
        </Button>
      </div>
      {vagas ? (
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold tracking-tight">{t("ordens.vagas")}</h2>
          {vagas.duracaoMin === null ? (
            <p className="text-sm text-destructive">{t("ordens.semDuracao")}</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {vagas.janelas.map((linha) => (
                <li key={linha.id} className="rounded-lg border border-border px-3 py-2">
                  <span className="font-medium">
                    {linha.codigo} {linha.inicio}–{linha.fim}
                  </span>{" "}
                  · {t(`vaga.${linha.estado}`)} · {t("ordens.equipasFolga", { n: linha.equipasLivres })}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </form>
  );
}
