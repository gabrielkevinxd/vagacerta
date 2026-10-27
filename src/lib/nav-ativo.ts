/** Active nav item from the current route. Painel only exact `/`; others match prefix for subroutes. */
export function navItemAtivo(caminho: string, href: string): boolean {
  const path = (caminho.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  const alvo = href.replace(/\/+$/, "") || "/";
  if (alvo === "/") return path === "/";
  return path === alvo || path.startsWith(`${alvo}/`);
}
