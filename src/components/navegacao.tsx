"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Plug,
  Settings,
  Shuffle,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useT } from "@/components/idioma/provedor";
import { navItemAtivo } from "@/lib/nav-ativo";

type Item = { href: string; rotulo: string; icone: string };
type Grupo = { id: string; rotulo: string; itens: Item[] };

const ICONES = {
  painel: LayoutDashboard,
  agenda: CalendarDays,
  ordens: ClipboardList,
  equipas: Users,
  reencaixe: Shuffle,
  assistente: Bot,
  integracao: Plug,
  gemeo: FlaskConical,
  definicoes: Settings,
} as const;

export function Navegacao({
  grupos,
  marca,
  rodape,
}: {
  grupos: Grupo[];
  /** @deprecated Active state uses `usePathname`; kept optional for call-site compatibility. */
  caminho?: string;
  marca: string;
  rodape?: React.ReactNode;
}) {
  const { t } = useT();
  const pathname = usePathname() || "/";
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-12 justify-center border-b border-sidebar-border px-3">
        <Link href="/" className="flex items-center gap-2 overflow-hidden rounded-md px-1 foco-anel">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px]/4 font-semibold text-primary-foreground">
            VC
          </span>
          <span className="truncate text-[13px]/5 font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            {marca}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.id}>
            <SidebarGroupLabel className="text-[11px]/4 font-medium tracking-wide text-muted-foreground uppercase">
              {grupo.rotulo}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => {
                  const ativo = navItemAtivo(pathname, item.href);
                  const Icone = ICONES[item.icone as keyof typeof ICONES] ?? LayoutDashboard;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={ativo} tooltip={item.rotulo} className="h-8 text-[13px]/5 font-medium">
                        <Link href={item.href} aria-current={ativo ? "page" : undefined}>
                          <Icone className="size-4" strokeWidth={1.75} />
                          <span>{item.rotulo}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {rodape ? <SidebarFooter className="border-t border-sidebar-border">{rodape}</SidebarFooter> : null}
      <SidebarRail aria-label={t("nav.recolher")} />
    </Sidebar>
  );
}
