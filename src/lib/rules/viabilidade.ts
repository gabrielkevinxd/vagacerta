import type { BlocoTempo, Restricoes, Trabalho, TrabalhoPlaneado } from "./tipos";

/**
 * Um conjunto de compromissos é viável quando EXISTE uma ordem dos trabalhos
 * e um minuto de início para cada um, tais que:
 *
 * 1. O início cai dentro da janela prometida, inclusive. A janela não é a
 *    execução: a ocupação pode passar do fim da janela.
 * 2. A ocupação é [início, início + duração) e cabe no turno.
 * 3. A ocupação não cruza indisponibilidades (intervalos semiabertos).
 * 4. O trabalho seguinte só começa `margemDeslocacaoMin` depois do fim do
 *    anterior. A margem é deslocação entre trabalhos, não uma almofada no primeiro.
 *
 * Para uma sequência fixa, o início mais cedo de cada trabalho é ótimo: atrasar
 * um trabalho anterior só empurra os seguintes. A pesquisa experimenta sequências
 * (primeiro o fim de janela mais cedo) e fixa esses inícios. A janela só fica
 * fechada quando nenhuma sequência cabe.
 */

const MAX_TRABALHOS = 9;
const cache = new Map<string, TrabalhoPlaneado[] | null>();

export function limparCacheViabilidade(): void {
  cache.clear();
}

function cruzaBloco(inicio: number, fim: number, blocos: BlocoTempo[]): BlocoTempo | undefined {
  return blocos.find((bloco) => inicio < bloco.fim && fim > bloco.inicio);
}

export function inicioMaisCedo(trabalho: Trabalho, prontoEm: number, restricoes: Restricoes): number | null {
  const limite = Math.min(trabalho.janelaFim, restricoes.fimTurno - trabalho.duracao);
  let instante = Math.max(trabalho.janelaInicio, restricoes.inicioTurno, prontoEm);
  if (instante > limite) return null;

  const blocos = [...restricoes.blocos].sort((a, b) => a.inicio - b.inicio);
  for (let guarda = 0; guarda < blocos.length + 2; guarda += 1) {
    if (instante > limite) return null;
    const choque = cruzaBloco(instante, instante + trabalho.duracao, blocos);
    if (!choque) return instante;
    const seguinte = Math.max(choque.fim, instante + 1);
    if (seguinte === instante) return null;
    instante = seguinte;
  }
  return null;
}

function pesquisar(trabalhos: Trabalho[], restricoes: Restricoes): TrabalhoPlaneado[] | null {
  const total = trabalhos.length;
  if (total === 0) return [];
  if (total > MAX_TRABALHOS) return null;
  if (restricoes.margemDeslocacaoMin < 0) return null;
  if (restricoes.fimTurno < restricoes.inicioTurno) return null;

  for (const trabalho of trabalhos) {
    if (trabalho.duracao <= 0) return null;
    if (trabalho.janelaInicio > trabalho.janelaFim) return null;
    if (inicioMaisCedo(trabalho, restricoes.inicioTurno, restricoes) === null) return null;
  }

  const memo = new Map<string, TrabalhoPlaneado[] | null>();

  function procurar(mascara: number, pronto: number): TrabalhoPlaneado[] | null {
    if (mascara === (1 << total) - 1) return [];
    const chave = `${mascara}:${pronto}`;
    if (memo.has(chave)) return memo.get(chave) ?? null;

    const pendentes: number[] = [];
    for (let indice = 0; indice < total; indice += 1) {
      if ((mascara & (1 << indice)) === 0) pendentes.push(indice);
    }
    pendentes.sort(
      (a, b) =>
        trabalhos[a].janelaFim - trabalhos[b].janelaFim ||
        trabalhos[a].janelaInicio - trabalhos[b].janelaInicio,
    );

    for (const indice of pendentes) {
      const inicio = inicioMaisCedo(trabalhos[indice], pronto, restricoes);
      if (inicio === null) continue;
      const resto = procurar(
        mascara | (1 << indice),
        inicio + trabalhos[indice].duracao + restricoes.margemDeslocacaoMin,
      );
      if (resto) {
        const plano = [{ id: trabalhos[indice].id, inicio, fim: inicio + trabalhos[indice].duracao }, ...resto];
        memo.set(chave, plano);
        return plano;
      }
    }

    memo.set(chave, null);
    return null;
  }

  return procurar(0, restricoes.inicioTurno);
}

export function resolverSequencia(trabalhos: Trabalho[], restricoes: Restricoes): TrabalhoPlaneado[] | null {
  const chave = [
    restricoes.inicioTurno,
    restricoes.fimTurno,
    restricoes.margemDeslocacaoMin,
    restricoes.blocos.map((bloco) => `${bloco.inicio}-${bloco.fim}`).join(","),
    trabalhos
      .map((trabalho) => `${trabalho.id}@${trabalho.janelaInicio}-${trabalho.janelaFim}:${trabalho.duracao}`)
      .join(";"),
  ].join("|");
  const existente = cache.get(chave);
  if (existente !== undefined) {
    return existente ? existente.map((linha) => ({ ...linha })) : null;
  }
  const resultado = pesquisar(trabalhos, restricoes);
  if (cache.size > 400) cache.clear();
  cache.set(chave, resultado);
  return resultado ? resultado.map((linha) => ({ ...linha })) : null;
}

export function sequenciaViavel(trabalhos: Trabalho[], restricoes: Restricoes): boolean {
  return resolverSequencia(trabalhos, restricoes) !== null;
}
