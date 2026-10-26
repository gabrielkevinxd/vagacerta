export function um(valor: string | string[] | undefined, omissao = ""): string {
  if (Array.isArray(valor)) return valor[0] ?? omissao;
  return valor ?? omissao;
}
