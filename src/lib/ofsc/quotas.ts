export const TIPOS_INTERVENCAO = ["instalacao", "manutencao", "adicional"] as const;
export type TipoIntervencao = (typeof TIPOS_INTERVENCAO)[number];

/** Tecto diário por técnico: 3 instalações ≡ 8 manutenções. */
export const QUOTA_INSTALACOES = 3;
export const QUOTA_MANUTENCOES = 8;
export const UNIDADES_INSTALACAO = QUOTA_MANUTENCOES / QUOTA_INSTALACOES;

export type MotivoRecusa = "Capacidade Esgotada" | "Zona Fechada" | "Fora da janela" | "Técnico indisponível";

export function eTipoIntervencao(valor: string): valor is TipoIntervencao {
  return (TIPOS_INTERVENCAO as readonly string[]).includes(valor);
}

export function tipoDeCategoria(categoria: string): TipoIntervencao {
  if (categoria === "suporte" || categoria === "manutencao") return "manutencao";
  if (categoria === "adicional") return "adicional";
  return "instalacao";
}

export function categoriaDoTipo(tipo: TipoIntervencao): "instalacao" | "suporte" | "adicional" {
  if (tipo === "manutencao") return "suporte";
  if (tipo === "adicional") return "adicional";
  return "instalacao";
}

export function unidadesDoTipo(tipo: TipoIntervencao, quantidade = 1): number {
  return tipo === "instalacao" ? quantidade * UNIDADES_INSTALACAO : quantidade;
}

export function unidadesOcupadas(contagem: { instalacao: number; manutencao: number; adicional: number }): number {
  return (
    unidadesDoTipo("instalacao", contagem.instalacao) +
    unidadesDoTipo("manutencao", contagem.manutencao) +
    unidadesDoTipo("adicional", contagem.adicional)
  );
}

export function vagasRestantes(ocupadas: number, tipo: TipoIntervencao): number {
  const livre = Math.max(0, QUOTA_MANUTENCOES - ocupadas);
  if (tipo === "instalacao") return Math.floor((livre + 1e-9) / UNIDADES_INSTALACAO);
  return Math.floor(livre + 1e-9);
}

export function cabeNaQuota(ocupadas: number, tipo: TipoIntervencao): boolean {
  return vagasRestantes(ocupadas, tipo) >= 1;
}

export function rotuloTipo(tipo: TipoIntervencao, idioma: "pt-PT" | "en" = "pt-PT"): string {
  if (idioma === "en") {
    if (tipo === "instalacao") return "installations";
    if (tipo === "manutencao") return "maintenance";
    return "add-ons";
  }
  if (tipo === "instalacao") return "instalações";
  if (tipo === "manutencao") return "manutenções";
  return "adicionais";
}

export function fraseContador(
  tecnico: string,
  data: string,
  tipo: TipoIntervencao,
  de: number,
  para: number,
  idioma: "pt-PT" | "en" = "pt-PT",
): string {
  if (idioma === "en") return `${tecnico}, ${data}, ${rotuloTipo(tipo, "en")} = ${para} slots (${de} → ${para})`;
  return `${tecnico}, ${data}, ${rotuloTipo(tipo)} = ${para} vagas (${de} → ${para})`;
}
