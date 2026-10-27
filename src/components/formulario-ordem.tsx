"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AREAS } from "@/lib/rules/areas";
import { useT } from "@/components/idioma/provedor";
import { CATEGORIAS, OPERADORES, PRIORIDADES, TECNOLOGIAS, type OperadorId } from "@/lib/rules/tipos";
import type { PublicacaoVagas } from "@/lib/rules/vagas";
import { enviar } from "@/lib/cliente";
import { SeletorData } from "@/components/seletor-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface JanelaOpcao {
  operadorId: string;
  categoria: string;
  codigo: string;
  inicio: string;
  fim: string;
}

const HORAS_30 = (() => {
  const horas: string[] = [];
  for (let total = 8 * 60; total <= 22 * 60; total += 30) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    horas.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return horas;
})();

type ErrosCampo = Partial<Record<"clienteNome" | "clienteContacto" | "morada" | "referencia" | "janela", string>>;

function RotuloOpcional({ htmlFor, children, opcional }: { htmlFor: string; children: React.ReactNode; opcional?: boolean }) {
  const { t } = useT();
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {opcional ? <span className="font-normal text-muted-foreground"> {t("comum.opcionalSufixo")}</span> : null}
    </Label>
  );
}

function ErroCampo({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return <p className="text-xs text-destructive">{mensagem}</p>;
}

function primeiraJanela(opcoes: JanelaOpcao[]): { inicio: string; fim: string } {
  return { inicio: opcoes[0]?.inicio ?? "08:00", fim: opcoes[0]?.fim ?? "10:00" };
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
  const inicial = useMemo(
    () =>
      primeiraJanela(
        janelas.filter(
          (linha) => linha.operadorId === (operadorFixo ?? "azul") && (linha.categoria === "instalacao" || linha.categoria === "qualquer"),
        ),
      ),
    [janelas, operadorFixo],
  );
  const [janelaInicio, setJanelaInicio] = useState(inicial.inicio);
  const [janelaFim, setJanelaFim] = useState(inicial.fim);
  const [area, setArea] = useState<string>(AREAS[0]);
  const [zonaId, setZonaId] = useState(zonas[0]?.id ?? "");
  const [prioridade, setPrioridade] = useState("media");
  const [modo, setModo] = useState("agendar");
  const [data, setData] = useState(dataInicial);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteContacto, setClienteContacto] = useState("");
  const [morada, setMorada] = useState("");
  const [referencia, setReferencia] = useState("");
  const [errosCampo, setErrosCampo] = useState<ErrosCampo>({});
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

  function aplicarOperador(valor: OperadorId) {
    setOperadorId(valor);
    const proximas = janelas.filter(
      (linha) => linha.operadorId === valor && (linha.categoria === categoria || linha.categoria === "qualquer"),
    );
    const janela = primeiraJanela(proximas);
    setJanelaInicio(janela.inicio);
    setJanelaFim(janela.fim);
  }

  function aplicarCategoria(valor: (typeof CATEGORIAS)[number]) {
    setCategoria(valor);
    const proximas = janelas.filter(
      (linha) => linha.operadorId === operadorId && (linha.categoria === valor || linha.categoria === "qualquer"),
    );
    const janela = primeiraJanela(proximas);
    setJanelaInicio(janela.inicio);
    setJanelaFim(janela.fim);
  }

  const inicioValido = opcoes.some((linha) => linha.inicio === janelaInicio) || HORAS_30.includes(janelaInicio);
  const fimValido = HORAS_30.includes(janelaFim) && janelaFim > janelaInicio;
  const inicioEfetivo = inicioValido ? janelaInicio : (opcoes[0]?.inicio ?? "08:00");
  const fimEfetivo = fimValido && inicioEfetivo === janelaInicio ? janelaFim : (opcoes.find((l) => l.inicio === inicioEfetivo)?.fim ?? opcoes[0]?.fim ?? "10:00");

  const janelaAtual =
    opcoes.find((linha) => linha.inicio === inicioEfetivo && linha.fim === fimEfetivo) ??
    ({ inicio: inicioEfetivo, fim: fimEfetivo, codigo: "", operadorId, categoria } satisfies JanelaOpcao);

  function validar(): ErrosCampo {
    const proximos: ErrosCampo = {};
    if (referencia.trim().length < 3) proximos.referencia = t("validacao.referencia");
    if (clienteNome.trim().length < 3) proximos.clienteNome = t("validacao.cliente");
    if (clienteContacto.trim().length < 5) proximos.clienteContacto = t("validacao.contacto");
    if (morada.trim().length < 5) proximos.morada = t("validacao.morada");
    if (!inicioEfetivo || !fimEfetivo || fimEfetivo <= inicioEfetivo) proximos.janela = t("ordens.semJanela");
    return proximos;
  }

  async function submeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const proximos = validar();
    setErrosCampo(proximos);
    if (Object.keys(proximos).length > 0) {
      setErro(null);
      return;
    }
    const dados = new FormData(evento.currentTarget);
    setAGuardar(true);
    setErro(null);
    try {
      const criada = await enviar<{ id: string }>("/api/ordens", {
        operadorId,
        referencia: referencia.trim(),
        area,
        zonaId,
        categoria,
        tecnologia: operadorId === "verde" ? tecnologia : null,
        data,
        janelaInicio: janelaAtual.inicio,
        janelaFim: janelaAtual.fim,
        prioridade,
        clienteNome: clienteNome.trim(),
        clienteContacto: clienteContacto.trim(),
        morada: morada.trim(),
        nota: String(dados.get("nota") ?? ""),
        modo,
      });
      toast(t("toast.ordemCriada", { ref: referencia.trim() || criada.id }), {
        duration: 6000,
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

  const categoriasVisiveis = CATEGORIAS.filter((item) => operadorId === "verde" || item !== "desligamento");

  return (
    <form onSubmit={submeter} className="space-y-6" noValidate>
      <section className="space-y-3">
        <h2 className="text-[13px]/5 font-semibold tracking-tight">{t("ordens.seccaoCliente")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <RotuloOpcional htmlFor="clienteNome">{t("ordens.cliente")}</RotuloOpcional>
            <Input
              id="clienteNome"
              name="clienteNome"
              value={clienteNome}
              onChange={(evento) => setClienteNome(evento.target.value)}
              required
              minLength={3}
              aria-invalid={Boolean(errosCampo.clienteNome) || undefined}
              className="h-9 text-[13px]/5"
            />
            <ErroCampo mensagem={errosCampo.clienteNome} />
          </div>
          <div className="space-y-1.5">
            <RotuloOpcional htmlFor="clienteContacto">{t("ordens.contacto")}</RotuloOpcional>
            <Input
              id="clienteContacto"
              name="clienteContacto"
              value={clienteContacto}
              onChange={(evento) => setClienteContacto(evento.target.value)}
              required
              minLength={5}
              aria-invalid={Boolean(errosCampo.clienteContacto) || undefined}
              className="h-9 text-[13px]/5"
            />
            <ErroCampo mensagem={errosCampo.clienteContacto} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <RotuloOpcional htmlFor="morada">{t("ordens.morada")}</RotuloOpcional>
            <Input
              id="morada"
              name="morada"
              value={morada}
              onChange={(evento) => setMorada(evento.target.value)}
              required
              minLength={5}
              aria-invalid={Boolean(errosCampo.morada) || undefined}
              className="h-9 text-[13px]/5"
            />
            <ErroCampo mensagem={errosCampo.morada} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px]/5 font-semibold tracking-tight">{t("ordens.seccaoVisita")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="categoria">{t("ordens.tipoServico")}</Label>
            <Select value={categoria} onValueChange={(valor) => aplicarCategoria(valor as (typeof CATEGORIAS)[number])}>
              <SelectTrigger id="categoria" className="h-9 w-full text-[13px]/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoriasVisiveis.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`categoria.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prioridade">{t("ordens.prioridade")}</Label>
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger id="prioridade" className="h-9 w-full text-[13px]/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`prioridade.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="data">{t("comum.data")}</Label>
            <SeletorData id="data" valor={data} onChange={setData} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="janela-inicio">{t("ordens.janelaInicioHora")}</Label>
            <Select
              value={inicioEfetivo}
              onValueChange={(valor) => {
                setJanelaInicio(valor);
                const match = opcoes.find((linha) => linha.inicio === valor);
                if (match) setJanelaFim(match.fim);
              }}
            >
              <SelectTrigger id="janela-inicio" className="h-9 w-full font-mono text-[13px]/5" aria-invalid={Boolean(errosCampo.janela) || undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(opcoes.length > 0 ? opcoes.map((linha) => linha.inicio) : HORAS_30)
                  .filter((hora, indice, lista) => lista.indexOf(hora) === indice)
                  .map((hora) => (
                    <SelectItem key={hora} value={hora}>
                      {hora}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="janela-fim">{t("ordens.janelaFimHora")}</Label>
            <Select value={fimEfetivo} onValueChange={setJanelaFim}>
              <SelectTrigger id="janela-fim" className="h-9 w-full font-mono text-[13px]/5" aria-invalid={Boolean(errosCampo.janela) || undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORAS_30.filter((hora) => hora > inicioEfetivo).map((hora) => (
                  <SelectItem key={hora} value={hora}>
                    {hora}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErroCampo mensagem={errosCampo.janela} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="operador">{t("comum.operador")}</Label>
            {operadorFixo ? (
              <p id="operador" className="text-[13px]/5">
                {t(`operador.${operadorFixo}`)}
              </p>
            ) : (
              <Select value={operadorId} onValueChange={(valor) => aplicarOperador(valor as OperadorId)}>
                <SelectTrigger id="operador" className="h-9 w-full text-[13px]/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERADORES.map((id) => (
                    <SelectItem key={id} value={id}>
                      {t(`operador.${id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <RotuloOpcional htmlFor="referencia">{t("ordens.referencia")}</RotuloOpcional>
            <Input
              id="referencia"
              name="referencia"
              value={referencia}
              onChange={(evento) => setReferencia(evento.target.value)}
              required
              minLength={3}
              placeholder="AZ-25001"
              aria-invalid={Boolean(errosCampo.referencia) || undefined}
              className="h-9 font-mono text-[13px]/5"
            />
            <ErroCampo mensagem={errosCampo.referencia} />
          </div>
          {operadorId === "verde" ? (
            <div className="space-y-1.5">
              <Label htmlFor="tecnologia">{t("ordens.tecnologia")}</Label>
              <Select value={tecnologia} onValueChange={setTecnologia}>
                <SelectTrigger id="tecnologia" className="h-9 w-full text-[13px]/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TECNOLOGIAS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`tecnologia.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="area">{t("ordens.area")}</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger id="area" className="h-9 w-full text-[13px]/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zonaId">{t("ordens.zona")}</Label>
            <Select value={zonaId} onValueChange={setZonaId}>
              <SelectTrigger id="zonaId" className="h-9 w-full text-[13px]/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zonas.map((zona) => (
                  <SelectItem key={zona.id} value={zona.id}>
                    {zona.codigo} · {zona.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modo">{t("ordens.oQueFazer")}</Label>
            <Select value={modo} onValueChange={setModo}>
              <SelectTrigger id="modo" className="h-9 w-full text-[13px]/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendar">{t("ordens.agendarJa")}</SelectItem>
                <SelectItem value="espera">{t("ordens.porFila")}</SelectItem>
                <SelectItem value="pendente">{t("ordens.deixarPendente")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <RotuloOpcional htmlFor="nota" opcional>
              {t("ordens.nota")}
            </RotuloOpcional>
            <Textarea id="nota" name="nota" className="text-[13px]/5" />
          </div>
        </div>
      </section>

      {erro ? (
        <p role="alert" className="text-[13px]/5 text-destructive">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => void consultarVagas()}>
          {t("ordens.verVagas")}
        </Button>
        <Button asChild type="button" variant="ghost">
          <Link href="/ordens">{t("comum.cancelar")}</Link>
        </Button>
        <Button type="submit" disabled={aGuardar}>
          {aGuardar ? t("comum.aGuardar") : t("ordens.criarOrdem")}
        </Button>
      </div>

      {vagas ? (
        <div>
          <h2 className="text-[13px]/5 font-semibold tracking-tight">{t("ordens.vagas")}</h2>
          {vagas.duracaoMin === null ? (
            <p className="text-[13px]/5 text-destructive">{t("ordens.semDuracao")}</p>
          ) : (
            <ul className="mt-2 space-y-2 text-[13px]/5">
              {vagas.janelas.map((linha) => (
                <li key={linha.id} className="rounded-md border border-border px-3 py-2">
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
