"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useT } from "@/components/idioma/provedor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OPERADORES, type OperadorId } from "@/lib/rules";
import { cn } from "@/lib/utils";

type Props = {
  caminho: "/equipas" | "/agenda";
  extras?: Record<string, string>;
  q?: string;
  distrito: string;
  municipio: string;
  operador?: OperadorId | null;
  distritos: string[];
  municipios: string[];
  mostrarOperador?: boolean;
  mostrarPesquisa?: boolean;
};

function montarUrl(
  caminho: string,
  extras: Record<string, string>,
  valores: { q?: string; distrito?: string; municipio?: string; operador?: string | null; pagina?: string | null },
) {
  const params = new URLSearchParams(extras);
  if (valores.q) params.set("q", valores.q);
  else params.delete("q");
  if (valores.distrito) params.set("distrito", valores.distrito);
  else params.delete("distrito");
  if (valores.municipio) params.set("municipio", valores.municipio);
  else params.delete("municipio");
  if (valores.operador) params.set("operador", valores.operador);
  else params.delete("operador");
  if (valores.pagina) params.set("pagina", valores.pagina);
  else params.delete("pagina");
  const texto = params.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

function ChipPopover({
  etiqueta,
  valor,
  opcoes,
  onEscolher,
  onLimpar,
}: {
  etiqueta: string;
  valor: string;
  opcoes: string[];
  onEscolher: (v: string) => void;
  onLimpar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const { t } = useT();
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <div className="inline-flex h-8 items-stretch">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={aberto}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              valor ? "border-primary bg-muted font-medium" : "border-border bg-card",
              valor ? "rounded-r-none border-r-0" : undefined,
            )}
          >
            {valor ? `${etiqueta}: ${valor}` : etiqueta}
            {valor ? null : <ChevronDown className="size-3.5 opacity-60" strokeWidth={1.75} />}
          </button>
        </PopoverTrigger>
        {valor ? (
          <button
            type="button"
            aria-label={t("equipas.limparFiltros")}
            className="inline-flex h-8 items-center rounded-r-md border border-primary bg-muted px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={() => onLimpar()}
          >
            <X className="size-3.5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      <PopoverContent className="w-64 p-1" align="start">
        <ul className="max-h-64 overflow-auto">
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]/5 hover:bg-muted"
              onClick={() => {
                onLimpar();
                setAberto(false);
              }}
            >
              {t("equipas.filtrarTodos")}
            </button>
          </li>
          {opcoes.map((opcao) => (
            <li key={opcao}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]/5 hover:bg-muted"
                onClick={() => {
                  onEscolher(opcao);
                  setAberto(false);
                }}
              >
                {valor === opcao ? <Check className="size-3.5" strokeWidth={1.75} /> : <span className="size-3.5" />}
                {opcao}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function FiltrosZona({
  caminho,
  extras = {},
  q = "",
  distrito,
  municipio,
  operador = null,
  distritos,
  municipios,
  mostrarOperador = false,
  mostrarPesquisa = false,
}: Props) {
  const { t } = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [textoLocal, setTextoLocal] = useState<string | null>(null);
  const [qProp, setQProp] = useState(q);
  if (q !== qProp) {
    setQProp(q);
    setTextoLocal(null);
  }
  const texto = textoLocal ?? q;
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function ir(
    parcial: {
      q?: string;
      distrito?: string;
      municipio?: string;
      operador?: string | null;
    },
    { substituir = false }: { substituir?: boolean } = {},
  ) {
    startTransition(() => {
      const url = montarUrl(caminho, extras, {
        q: parcial.q ?? texto,
        distrito: parcial.distrito ?? distrito,
        municipio: parcial.municipio ?? municipio,
        operador: parcial.operador === undefined ? operador : parcial.operador,
        pagina: null,
      });
      if (substituir) router.replace(url);
      else router.push(url);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {mostrarPesquisa ? (
        <Input
          aria-label={t("equipas.pesquisar")}
          placeholder={t("equipas.pesquisarPlaceholder")}
          value={texto}
          className="h-8 w-56"
          onChange={(evento) => {
            const valor = evento.target.value;
            setTextoLocal(valor);
            if (debounce.current) clearTimeout(debounce.current);
            debounce.current = setTimeout(() => ir({ q: valor.trim() }, { substituir: true }), 250);
          }}
        />
      ) : null}
      <ChipPopover
        etiqueta={t("equipas.filtrarDistrito")}
        valor={distrito}
        opcoes={distritos}
        onEscolher={(v) => ir({ distrito: v, municipio: "" })}
        onLimpar={() => ir({ distrito: "", municipio: "" })}
      />
      <ChipPopover
        etiqueta={t("equipas.filtrarMunicipio")}
        valor={municipio}
        opcoes={municipios}
        onEscolher={(v) => ir({ municipio: v })}
        onLimpar={() => ir({ municipio: "" })}
      />
      {mostrarOperador ? (
        <div className="inline-flex h-8 items-center rounded-md border border-border bg-card p-0.5" role="group" aria-label={t("equipas.filtrarOperador")}>
          <button
            type="button"
            aria-pressed={!operador}
            className={cn(
              "inline-flex h-7 items-center rounded-[5px] px-2.5 text-[13px]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              !operador ? "bg-muted font-medium" : "text-muted-foreground",
            )}
            onClick={() => ir({ operador: null })}
          >
            {t("equipas.filtrarTodos")}
          </button>
          {OPERADORES.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={operador === id}
              className={cn(
                "inline-flex h-7 items-center rounded-[5px] px-2.5 text-[13px]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                operador === id ? "bg-muted font-medium" : "text-muted-foreground",
              )}
              onClick={() => ir({ operador: id })}
            >
              {t(`operador.${id}`)}
            </button>
          ))}
        </div>
      ) : null}
      {distrito || municipio || operador || texto ? (
        <Button
          type="button"
          variant="ghost"
          className="h-8"
          onClick={() => {
            setTextoLocal("");
            startTransition(() => {
              router.replace(montarUrl(caminho, extras, { q: "", distrito: "", municipio: "", operador: null, pagina: null }));
            });
          }}
        >
          {t("equipas.limparFiltros")}
        </Button>
      ) : null}
    </div>
  );
}
