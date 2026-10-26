/** Gerador determinístico (Mulberry32). A mesma semente reproduz a mesma sequência. */

export type Gerador = () => number;

export function mulberry32(semente: number): Gerador {
  let estado = semente >>> 0;
  if (estado === 0) estado = 0x6d2b79f5;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function misturarSemente(semente: number, replica: number): number {
  let x = (semente >>> 0) ^ Math.imul(replica + 1, 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x === 0 ? 1 : x;
}

export function inteiroEntre(rng: Gerador, minimo: number, maximo: number): number {
  return minimo + Math.floor(rng() * (maximo - minimo + 1));
}

export function escolher<T>(rng: Gerador, itens: readonly T[]): T {
  return itens[Math.floor(rng() * itens.length)]!;
}

export function ponderado<T>(rng: Gerador, itens: readonly { valor: T; peso: number }[]): T {
  const total = itens.reduce((soma, item) => soma + Math.max(0, item.peso), 0);
  if (total <= 0) return itens[0]!.valor;
  let cursor = rng() * total;
  for (const item of itens) {
    cursor -= Math.max(0, item.peso);
    if (cursor <= 0) return item.valor;
  }
  return itens[itens.length - 1]!.valor;
}

export function poisson(rng: Gerador, lambda: number): number {
  if (lambda <= 0) return 0;
  const limite = Math.exp(-lambda);
  let conta = 0;
  let produto = 1;
  do {
    conta += 1;
    produto *= rng();
  } while (produto > limite && conta < 10_000);
  return conta - 1;
}

export function baralhar<T>(rng: Gerador, itens: readonly T[]): T[] {
  const copia = [...itens];
  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const troca = Math.floor(rng() * (indice + 1));
    const actual = copia[indice]!;
    copia[indice] = copia[troca]!;
    copia[troca] = actual;
  }
  return copia;
}
