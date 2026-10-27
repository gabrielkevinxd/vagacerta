import { nomesAreasCobertura } from "@/lib/zonas/catalogo";

/**
 * Localidades válidas para área de ordem/equipa: os 92 municípios com cobertura
 * catalogada (RNG Norte + Alentejo/Algarve + demo-seed).
 */
export const AREAS = nomesAreasCobertura() as unknown as readonly [
  string,
  ...string[],
];

export type Area = (typeof AREAS)[number];
