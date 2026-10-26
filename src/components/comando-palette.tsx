"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Languages,
  Plus,
  Plug,
  Settings,
  Shuffle,
  Users,
} from "lucide-react";
import { useT } from "@/components/idioma/provedor";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { definirIdiomaAcao } from "@/app/idioma/acao";
import type { Chave } from "@/lib/i18n";

export function ComandoPalette({ destinos }: { destinos: { href: string; rotulo: Chave; icone: string }[] }) {
  const { t, idioma } = useT();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
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

  const ir = (href: string) => {
    setAberto(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-8 w-full max-w-xs items-center gap-2 rounded-md border border-input bg-background px-2.5 text-[13px]/5 text-muted-foreground transition-colors hover:bg-muted foco-anel"
      >
        <span className="flex-1 truncate text-left">{t("comando.procurar")}</span>
        <kbd className="pointer-events-none hidden h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[11px]/4 text-muted-foreground sm:inline-flex">
          {t("comando.atalho")}
        </kbd>
      </button>
      <CommandDialog open={aberto} onOpenChange={setAberto} title={t("comando.titulo")} description={t("comando.descricao")}>
        <Command>
          <CommandInput placeholder={t("comando.procurar")} />
          <CommandList>
            <CommandEmpty>{t("comando.semResultados")}</CommandEmpty>
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
                <CommandShortcut>C</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => ir("/agenda")}>
                <CalendarDays className="size-4" />
                {t("comando.agendaHoje")}
                <CommandShortcut>G A</CommandShortcut>
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
