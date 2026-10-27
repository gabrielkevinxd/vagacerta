import type { Chave } from "@/lib/i18n";

export type Miga = { href: string; rotuloChave?: Chave; rotuloFixo?: string; entidade?: boolean };

const SEGMENTOS_NAV = new Set([
  "ordens",
  "equipas",
  "agenda",
  "otimizador",
  "assistente",
  "integracao",
  "gemeo",
  "definicoes",
]);

export function chaveDeHref(href: string): Chave {
  if (href === "/") return "nav.painel";
  if (href.startsWith("/ordens")) return "nav.ordens";
  if (href.startsWith("/equipas")) return "nav.equipas";
  if (href.startsWith("/agenda")) return "nav.agenda";
  if (href.startsWith("/otimizador")) return "nav.reencaixe";
  if (href.startsWith("/assistente")) return "nav.assistente";
  if (href.startsWith("/integracao")) return "nav.integracao";
  if (href.startsWith("/gemeo")) return "nav.gemeo";
  if (href.startsWith("/definicoes")) return "nav.definicoes";
  return "nav.painel";
}

/** Structural breadcrumb from pathname. Entity segments are marked for page-provided labels. */
export function migalhasDeCaminho(caminho: string): Miga[] {
  const path = (caminho.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  const partes: Miga[] = [{ href: "/", rotuloChave: "nav.painel" }];
  if (path === "/") return partes;

  const segmentos = path.split("/").filter(Boolean);
  let acc = "";
  for (const segmento of segmentos) {
    acc += `/${segmento}`;
    if (segmento === "nova") {
      partes.push({ href: acc, rotuloChave: "painel.novaOrdem" });
    } else if (SEGMENTOS_NAV.has(segmento)) {
      partes.push({ href: acc, rotuloChave: chaveDeHref(acc) });
    } else if (acc.startsWith("/ordens/")) {
      partes.push({ href: acc, rotuloChave: "reencaixe.ordem", entidade: true });
    } else if (acc.startsWith("/equipas/")) {
      partes.push({ href: acc, rotuloChave: "nav.equipas", entidade: true });
    } else {
      partes.push({ href: acc, rotuloFixo: segmento.toUpperCase() });
    }
  }
  return partes;
}
