/** Localidades de demonstração. A área da ordem tem de ser uma destas. */
export const AREAS = [
  "Braga",
  "Guimarães",
  "Barcelos",
  "Esposende",
  "Vila Real",
  "Chaves",
  "Vila Pouca de Aguiar",
  "Viseu",
  "Guarda",
  "Covilhã",
  "Aveiro",
  "Águeda",
  "Oliveira de Azeméis",
  "Boticas",
  "Montalegre",
] as const;

export type Area = (typeof AREAS)[number];
