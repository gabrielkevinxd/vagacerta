"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useT } from "@/components/idioma/provedor";
import type { Chave } from "@/lib/i18n";
import { formatarDataLocale } from "@/lib/i18n/formatacao";
import { traduzirMensagem } from "@/lib/i18n/motor";
import { ErroApi, enviar } from "@/lib/cliente";
import { Alerta } from "@/components/layout/alerta";
import { SeletorData } from "@/components/seletor-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OperadorId } from "@/lib/rules";

const campo = "h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]/5";
const DIAS: Chave[] = [
  "diaSemana.d1",
  "diaSemana.d1",
  "diaSemana.d2",
  "diaSemana.d3",
  "diaSemana.d4",
  "diaSemana.d5",
  "diaSemana.d6",
  "diaSemana.d7",
];

const OPERADORES = ["azul", "vermelho", "verde"] as const;

type OrdemFutura = { id: string; referencia: string; operadorId: OperadorId; data: string };

export function AcoesEquipa({
  equipaId,
  equipaNome,
  ativa,
  zonas,
  zonaAtualId,
  zonaPredefinidaId,
  horarios,
  membros,
  indisponibilidades,
  operadoresServidos,
}: {
  equipaId: string;
  equipaNome: string;
  ativa: boolean;
  zonas: { id: string; codigo: string; nome: string }[];
  zonaAtualId?: string | null;
  zonaPredefinidaId?: string | null;
  horarios: { diaSemana: number; inicio: string; fim: string }[];
  membros: { id: string; nome: string; ativo: boolean }[];
  indisponibilidades: { id: string; data: string; inicio: string; fim: string; motivo: string }[];
  operadoresServidos: ("azul" | "vermelho" | "verde")[];
}) {
  const { t, tp, idioma, m } = useT();
  const router = useRouter();
  const [erro, setErro] = useState<ReactNode>(null);
  const [aTrabalhar, setATrabalhar] = useState(false);
  const [confirmarDesativar, setConfirmarDesativar] = useState(false);
  const [membroADesativar, setMembroADesativar] = useState<{ id: string; nome: string } | null>(null);
  const chaveServidos = operadoresServidos.join(",");
  const [servidosChave, setServidosChave] = useState(chaveServidos);
  const [servidos, setServidos] = useState<("azul" | "vermelho" | "verde")[]>(operadoresServidos);
  const [aConfirmarRemocao, setAConfirmarRemocao] = useState<OperadorId[] | null>(null);
  const nome = equipaNome;
  const zonaSelectPadrao =
    zonaAtualId && zonas.some((z) => z.id === zonaAtualId)
      ? zonaAtualId
      : zonaPredefinidaId && zonas.some((z) => z.id === zonaPredefinidaId)
        ? zonaPredefinidaId
        : (zonas[0]?.id ?? "");

  if (chaveServidos !== servidosChave) {
    setServidosChave(chaveServidos);
    setServidos(operadoresServidos);
  }

  function listarOperadores(ids: OperadorId[], artigo: "o" | "do" | "the" | "none" = "o") {
    const ordenados = OPERADORES.filter((op) => ids.includes(op));
    const locale = idioma === "en" ? "en" : "pt-PT";
    const nomes = ordenados.map((id) => {
      const nome = t(`operador.${id}`);
      if (artigo === "none") return nome;
      if (idioma === "en") return `the ${nome.charAt(0).toLowerCase()}${nome.slice(1)}`;
      return `${artigo} ${nome}`;
    });
    if (nomes.length === 0) return "—";
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(nomes);
  }

  function mensagemOperadorComOrdens(detalhes: { remocoes?: OperadorId[]; ordens?: OrdemFutura[] } | undefined) {
    const ordens = detalhes?.ordens ?? [];
    const remocoes = detalhes?.remocoes ?? [];
    const operador = listarOperadores(remocoes, "o");
    const n = Math.max(ordens.length, 1);
    const marca = "\u0001";
    const prefixo = tp("equipas.operadorComOrdens", n, { operador, lista: marca, n });
    const [antes, depois] = prefixo.split(marca);
    return (
      <>
        {antes}
        {ordens.map((ordem, indice) => (
          <span key={ordem.id}>
            {indice > 0 ? ", " : null}
            <Link href={`/ordens/${ordem.id}`} className="underline underline-offset-2">
              {t("equipas.ordemFuturaItem", {
                referencia: ordem.referencia,
                data: formatarDataLocale(ordem.data, idioma),
              })}
            </Link>
          </span>
        ))}
        {depois}
      </>
    );
  }

  async function executar(trabalho: () => Promise<void>, aoErro?: (falha: unknown) => void) {
    setErro(null);
    setATrabalhar(true);
    try {
      await trabalho();
      router.refresh();
    } catch (falha) {
      aoErro?.(falha);
      if (falha instanceof ErroApi && falha.codigo === "OPERADOR_COM_ORDENS") {
        setServidos(operadoresServidos);
        setErro(mensagemOperadorComOrdens(falha.detalhes as { remocoes?: OperadorId[]; ordens?: OrdemFutura[] }));
      } else {
        const texto = falha instanceof Error ? falha.message : "";
        setErro(traduzirMensagem(m, texto) || t("comum.pedidoFalhou"));
      }
    } finally {
      setATrabalhar(false);
    }
  }

  async function desativarEquipa() {
    setConfirmarDesativar(false);
    await executar(async () => {
      await enviar(`/api/equipas/${equipaId}`, { ativa: false }, "PATCH");
      toast(t("toast.equipaDesativada", { nome }), {
        duration: 6000,
        action: {
          label: t("comum.anular"),
          onClick: () => {
            void enviar(`/api/equipas/${equipaId}`, { ativa: true }, "PATCH")
              .then(() => {
                toast(t("toast.equipaAtivada", { nome }));
                router.refresh();
              })
              .catch(() => undefined);
          },
        },
      });
    });
  }

  function pedirGuardarOperadores() {
    const removidos = operadoresServidos.filter((op) => !servidos.includes(op));
    if (removidos.length > 0) {
      setAConfirmarRemocao(removidos);
      return;
    }
    void guardarOperadores();
  }

  async function guardarOperadores() {
    setAConfirmarRemocao(null);
    await executar(async () => {
      await enviar(`/api/equipas/${equipaId}`, { operadoresServidos: servidos }, "PATCH");
      toast(t("toast.operadoresGuardados"));
    });
  }

  return (
    <div className="space-y-8">
      {!ativa ? (
        <div>
          <Button
            variant="outline"
            disabled={aTrabalhar}
            onClick={() =>
              executar(async () => {
                await enviar(`/api/equipas/${equipaId}`, { ativa: true }, "PATCH");
                toast(t("toast.equipaAtivada", { nome }));
              })
            }
          >
            {t("equipas.ativarEquipa")}
          </Button>
        </div>
      ) : null}

      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          const dados = new FormData(evento.currentTarget);
          const linhas = horarios.map((linha) => ({
            diaSemana: linha.diaSemana,
            inicio: String(dados.get(`inicio-${linha.diaSemana}`)),
            fim: String(dados.get(`fim-${linha.diaSemana}`)),
          }));
          void executar(() => enviar(`/api/equipas/${equipaId}`, { horarios: linhas }, "PATCH").then(() => undefined));
        }}
      >
        <h2 className="text-base font-semibold tracking-tight">{t("equipas.horario")}</h2>
        <ul className="space-y-2">
          {horarios.map((linha) => {
            const dia = t(DIAS[linha.diaSemana] ?? "diaSemana.d1");
            return (
              <li key={linha.diaSemana} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2">
                <span className="text-[13px]/5 capitalize">{dia}</span>
                <Input name={`inicio-${linha.diaSemana}`} defaultValue={linha.inicio} aria-label={t("equipas.inicioDe", { dia })} />
                <Input name={`fim-${linha.diaSemana}`} defaultValue={linha.fim} aria-label={t("equipas.fimDe", { dia })} />
              </li>
            );
          })}
        </ul>
        <Button type="submit" variant="outline" disabled={aTrabalhar}>
          {t("equipas.guardarHorario")}
        </Button>
      </form>

      <div className="grid gap-8 md:grid-cols-2">
        <form
          className="grid gap-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            const fim = String(dados.get("fim") ?? "");
            void executar(() =>
              enviar(`/api/equipas/${equipaId}/zona`, {
                zonaId: String(dados.get("zonaId")),
                inicio: String(dados.get("inicio")),
                fim: fim || null,
                confirmacao: dados.get("confirmacao") === "on",
              }).then(() => undefined),
            );
          }}
        >
          <h2 className="text-base font-semibold tracking-tight">{t("equipas.zonaVigor")}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="zona">{t("equipas.zona")}</Label>
            <select id="zona" name="zonaId" className={campo} defaultValue={zonaSelectPadrao}>
              {zonas.map((zona) => (
                <option key={zona.id} value={zona.id}>
                  {zona.codigo} · {zona.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inicio-zona">{t("comum.desde")}</Label>
            <SeletorData id="inicio-zona" name="inicio" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fim-zona">{t("comum.ate")}</Label>
            <SeletorData id="fim-zona" name="fim" />
          </div>
          <label className="flex items-center gap-2 text-[13px]/5">
            <input type="checkbox" name="confirmacao" />
            {t("equipas.confirmarPassado")}
          </label>
          <div>
            <Button type="submit" variant="outline" disabled={aTrabalhar} className="h-8">
              {t("equipas.guardarZona")}
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("equipas.operadoresServidos")}</h2>
          <p className="text-[13px]/5 text-muted-foreground">{t("equipas.operadoresServidosAjuda")}</p>
          {erro ? (
            <Alerta tom="erro" role="alert">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{t("equipas.naoGuardarTitulo")}</p>
                <div>{erro}</div>
              </div>
            </Alerta>
          ) : null}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("equipas.operadoresServidos")}>
            {OPERADORES.map((id) => {
              const ativo = servidos.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={ativo}
                  disabled={aTrabalhar}
                  className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[13px]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    ativo ? "border-primary bg-muted font-medium" : "border-border bg-card text-muted-foreground"
                  }`}
                  onClick={() =>
                    setServidos((atual) => {
                      if (atual.includes(id)) {
                        if (atual.length <= 1) return atual;
                        return atual.filter((item) => item !== id);
                      }
                      return OPERADORES.filter((op) => atual.includes(op) || op === id);
                    })
                  }
                >
                  {t(`operador.${id}`)}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            disabled={aTrabalhar || servidos.length === 0}
            onClick={() => pedirGuardarOperadores()}
          >
            {t("equipas.guardarOperadores")}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("equipas.membros")}</h2>
        <ul className="space-y-2 text-[13px]/5">
          {membros.map((membro) => (
            <li key={membro.id} className="flex items-center justify-between gap-3">
              <span>
                {membro.nome}
                {membro.ativo ? "" : ` ${t("comum.inativo")}`}
              </span>
              {membro.ativo ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={aTrabalhar}
                  onClick={() => setMembroADesativar({ id: membro.id, nome: membro.nome })}
                >
                  {t("equipas.desativar")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            const formulario = evento.currentTarget;
            void executar(async () => {
              await enviar(`/api/equipas/${equipaId}/membros`, { nome: String(dados.get("nome") ?? "") });
              formulario.reset();
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="novo-tecnico">{t("equipas.novoTecnico")}</Label>
            <Input id="novo-tecnico" name="nome" required minLength={3} />
          </div>
          <Button type="submit" variant="outline" disabled={aTrabalhar}>
            {t("equipas.acrescer")}
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("equipas.indisponibilidades")}</h2>
        <ul className="space-y-2 text-[13px]/5">
          {indisponibilidades.length === 0 ? <li className="text-muted-foreground">{t("equipas.nenhumaIndisp")}</li> : null}
          {indisponibilidades.map((bloco) => (
            <li key={bloco.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {formatarDataLocale(bloco.data, idioma)} {bloco.inicio}–{bloco.fim} · {bloco.motivo}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={aTrabalhar}
                onClick={() =>
                  executar(() =>
                    enviar(`/api/equipas/${equipaId}/indisponibilidades/${bloco.id}`, undefined, "DELETE").then(() => undefined),
                  )
                }
              >
                {t("comum.remover")}
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            const formulario = evento.currentTarget;
            void executar(async () => {
              await enviar(`/api/equipas/${equipaId}/indisponibilidades`, {
                data: String(dados.get("data")),
                inicio: String(dados.get("inicio")),
                fim: String(dados.get("fim")),
                motivo: String(dados.get("motivo")),
              });
              formulario.reset();
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="data-un">{t("comum.data")}</Label>
            <SeletorData id="data-un" name="data" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-un">{t("comum.motivo")}</Label>
            <Input id="motivo-un" name="motivo" required minLength={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inicio-un">{t("comum.inicio")}</Label>
            <Input id="inicio-un" name="inicio" placeholder="12:00" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fim-un">{t("comum.fim")}</Label>
            <Input id="fim-un" name="fim" placeholder="14:00" required />
          </div>
          <div>
            <Button type="submit" variant="outline" disabled={aTrabalhar}>
              {t("equipas.novaIndisp")}
            </Button>
          </div>
        </form>
      </div>

      {ativa ? (
        <section className="superficie space-y-3 border-destructive/30 p-4">
          <div className="space-y-1">
            <h2 className="text-[13px]/5 font-semibold tracking-tight">{t("equipas.zonaPerigo")}</h2>
            <p className="text-xs text-muted-foreground">{t("equipas.zonaPerigoAjuda")}</p>
          </div>
          <Button variant="destructive" disabled={aTrabalhar} onClick={() => setConfirmarDesativar(true)}>
            {t("equipas.desativarEquipa")}
          </Button>
        </section>
      ) : null}

      <Dialog open={Boolean(aConfirmarRemocao)} onOpenChange={(v) => !v && setAConfirmarRemocao(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {t("equipas.deixarDeServirTitulo", {
                operador: listarOperadores(aConfirmarRemocao ?? [], "o"),
              })}
            </DialogTitle>
            <DialogDescription>
              {t("equipas.deixarDeServirDetalhe", {
                equipa: nome,
                operador: listarOperadores(aConfirmarRemocao ?? [], "do"),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAConfirmarRemocao(null)}>
              {t("comum.cancelar")}
            </Button>
            <Button type="button" variant="destructive" disabled={aTrabalhar} onClick={() => void guardarOperadores()}>
              {t("equipas.deixarDeServir")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmarDesativar} onOpenChange={setConfirmarDesativar}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("confirmar.desativarEquipaTitulo", { nome })}</DialogTitle>
            <DialogDescription>{t("confirmar.desativarEquipaDetalhe")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarDesativar(false)}>
              {t("comum.cancelar")}
            </Button>
            <Button type="button" variant="destructive" disabled={aTrabalhar} onClick={() => void desativarEquipa()}>
              {t("confirmar.desativar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(membroADesativar)} onOpenChange={(v) => !v && setMembroADesativar(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("confirmar.desativarTecnicoTitulo", { nome: membroADesativar?.nome ?? "" })}</DialogTitle>
            <DialogDescription>{t("confirmar.desativarTecnicoDetalhe")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMembroADesativar(null)}>
              {t("comum.cancelar")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={aTrabalhar || !membroADesativar}
              onClick={() => {
                if (!membroADesativar) return;
                const alvo = membroADesativar;
                setMembroADesativar(null);
                void executar(async () => {
                  await enviar(`/api/equipas/${equipaId}/membros/${alvo.id}`, undefined, "DELETE");
                  toast(t("toast.tecnicoDesativado", { nome: alvo.nome }));
                });
              }}
            >
              {t("confirmar.desativar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
