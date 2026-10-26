export function folhasDe(valor: unknown, prefixo = ""): string[] {
  if (typeof valor === "string") return prefixo ? [prefixo] : [];
  if (!valor || typeof valor !== "object") return [];
  return Object.entries(valor as Record<string, unknown>).flatMap(([chave, filho]) =>
    folhasDe(filho, prefixo ? `${prefixo}.${chave}` : chave),
  );
}

export function valorEm(raiz: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((atual, parte) => {
    if (!atual || typeof atual !== "object") return undefined;
    return (atual as Record<string, unknown>)[parte];
  }, raiz);
}

export function interpolar(modelo: string, vars?: Record<string, string | number>): string {
  if (!vars) return modelo;
  return modelo.replace(/\{(\w+)\}/g, (_, nome: string) => (nome in vars ? String(vars[nome]) : `{${nome}}`));
}
