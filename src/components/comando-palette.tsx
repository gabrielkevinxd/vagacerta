"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Languages,
  Plus,
  Plug,
  Search,
  Settings,
  Shuffle,
  Users,
} from "lucide-react";
import { useT } from "@/components/idioma/provedor";
import { EtiquetaOperador } from "@/components/etiquetas";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { definirIdiomaAcao } from "@/app/idioma/acao";
import type { Chave } from "@/lib/i18n";
import type { OperadorId } from "@/lib/rules";

type Destino = { href: string; rotulo: Chave; icone: string };
type OrdemCmd = { id: string; referencia: string; clienteNome: string; operadorId: OperadorId };

const DEMO_ORDENS: OrdemCmd[] = [
  { id: "ord-az-24081", referencia: "AZ-24081", clienteNome: "Leonor Campos", operadorId: "azul" },
  { id: "ord-vr-90001", referencia: "VR-90001", clienteNome: "Duarte Pimentel", operadorId: "vermelho" },
  { id: "ord-vd-55210", referencia: "VD-55210", clienteNome: "Gonçalo Bentes", operadorId: "verde" },
  { id: "ord-az-24102", referencia: "AZ-24102", clienteNome: "Tiago Furtado", operadorId: "azul" },
  { id: "ord-vr-88350", referencia: "VR-88350", clienteNome: "Paulo Gameiro", operadorId: "vermelho" },
  { id: "ord-vd-urg", referencia: "VD-URG", clienteNome: "Matilde Queirós", operadorId: "verde" },
  { id: "ord-az-pend-01", referencia: "AZ-PEND-01", clienteNome: "Teresa Malhoa", operadorId: "azul" },
  { id: "ord-vr-fila-01", referencia: "VR-FILA-01", clienteNome: "Lourenço Paiva", operadorId: "vermelho" },
];

function eMac(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function ComandoPalette({ destinos }: { destinos: Destino[] }) {
  const { t, idioma } = useT();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [atalho, setAtalho] = useState("⌘K");

  useEffect(() => {
    setAtalho(eMac() ? "⌘K" : "Ctrl K");
    const onKey = (evento: KeyboardEvent) => {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setAberto((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const icones: Record<string, React.ComponentType<{ className?: string }>> = {
    painel: LayoutDashboard,
    agenda: CalendarDays,
    ordens: ClipboardList,
    equipas: Users,
    reencaixe: Shuffle,
    assistente: Bot,
    integracao: Plug,
    gemeo: FlaskConical,
    definicoes: Settings,
  };

  const ordensFiltradas = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    if (!q) return DEMO_ORDENS.slice(0, 8);
    return DEMO_ORDENS.filter(
      (o) => o.referencia.toLowerCase().includes(q) || o.clienteNome.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [pesquisa]);

  const ir = (href: string) => {
    setAberto(false);
    setPesquisa("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="hidden h-8 w-full max-w-xs items-center gap-2 rounded-md border border-input bg-background px-2.5 text-[13px]/5 text-muted-foreground transition-colors hover:bg-muted foco-anel sm:inline-flex"
      >
        <span className="flex-1 truncate text-left">{t("comando.procurar")}</span>
        <kbd className="pointer-events-none inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[11px]/4 text-muted-foreground">
          {atalho}
        </kbd>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setAberto(true)}
        aria-label={t("comando.procurar")}
      >
        <Search className="size-4" strokeWidth={1.75} />
      </Button>
      <CommandDialog open={aberto} onOpenChange={setAberto} title={t("comando.titulo")} description={t("comando.descricao")}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("comando.procurar")}
            value={pesquisa}
            onValueChange={setPesquisa}
          />
          <CommandList>
            <CommandEmpty>{t("comando.semResultados")}</CommandEmpty>
            <CommandGroup heading={t("comando.ordens")}>
              {ordensFiltradas.map((ordem) => (
                <CommandItem key={ordem.id} value={`${ordem.referencia} ${ordem.clienteNome}`} onSelect={() => ir(`/ordens?ordem=${ordem.id}`)}>
                  <EtiquetaOperador id={ordem.operadorId} soPonto />
                  <span className="font-mono text-[13px]/5">{ordem.referencia}</span>
                  <span className="truncate text-muted-foreground">{ordem.clienteNome}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={t("comando.irPara")}>
              {destinos.map((item) => {
                const Icone = icones[item.icone] ?? LayoutDashboard;
                return (
                  <CommandItem key={item.href} value={t(item.rotulo)} onSelect={() => ir(item.href)}>
                    <Icone className="size-4" />
                    {t(item.rotulo)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading={t("comando.accoes")}>
              <CommandItem onSelect={() => ir("/ordens/nova")}>
                <Plus className="size-4" />
                {t("comando.novaOrdem")}
              </CommandItem>
              <CommandItem onSelect={() => ir("/agenda")}>
                <CalendarDays className="size-4" />
                {t("comando.agendaHoje")}
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  const dados = new FormData();
                  dados.set("idioma", idioma === "pt-PT" ? "en" : "pt-PT");
                  void definirIdiomaAcao(dados);
                  setAberto(false);
                }}
              >
                <Languages className="size-4" />
                {t("comando.mudarIdioma")}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
