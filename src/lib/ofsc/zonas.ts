import { DEMO_AREA_PARA_DICOFRE, dicofreDaArea } from "@/lib/zonas/catalogo";

/** Zona = município (DICOFRE). Mapa das localidades de demonstração → DICOFRE. */
export const ZONA_POR_AREA: Record<string, string> = { ...DEMO_AREA_PARA_DICOFRE };

export function zonaDaArea(area: string): string {
  return dicofreDaArea(area) ?? ZONA_POR_AREA[area] ?? "0303";
}
