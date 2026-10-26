export const ZONA_POR_AREA: Record<string, string> = {
  Braga: "zn-n01",
  Barcelos: "zn-n02",
  Esposende: "zn-n02",
  "Vila Real": "zn-n03",
  Chaves: "zn-n03",
  "Vila Pouca de Aguiar": "zn-n03",
  Aveiro: "zn-n04",
  Águeda: "zn-n04",
  "Oliveira de Azeméis": "zn-n04",
  Boticas: "zn-n05",
  Montalegre: "zn-n05",
  Guimarães: "zn-n06",
  Viseu: "zn-c01",
  Guarda: "zn-c01",
  Covilhã: "zn-c01",
};

export function zonaDaArea(area: string): string {
  return ZONA_POR_AREA[area] ?? "zn-n01";
}
