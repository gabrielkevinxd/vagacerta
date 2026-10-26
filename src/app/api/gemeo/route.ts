import { eCentral, type Ator } from "@/lib/rules";
import { correrSimulacao, normalizarPedido, PEDIDO_OMISSAO } from "@/lib/gemeo";
import { esquemaGemeo } from "@/server/esquemas";
import { ErroHttp } from "@/server/erros";
import { relatorioDoLote } from "@/server/gemeo-injetar";
import { api, lerJson } from "@/server/http";
import { idiomaAtual } from "@/server/idioma";

function exigirCentral(ator: Ator) {
  if (!eCentral(ator)) {
    throw new ErroHttp(403, "SEM_PERMISSAO", "Só a central corre o gémeo digital.");
  }
}

export const GET = api(async (ator, pedido) => {
  exigirCentral(ator);
  const url = new URL(pedido.url);
  const lote = url.searchParams.get("lote");
  if (lote) return relatorioDoLote(lote, idiomaAtual());
  const numero = (nome: string) => {
    const valor = url.searchParams.get(nome);
    return valor === null || valor === "" ? undefined : Number(valor);
  };
  const bruto = {
    semente: numero("semente"),
    semanas: numero("semanas"),
    replicas: numero("replicas"),
    procura: numero("procura"),
    probabilidadeFalta: numero("faltas"),
    margemDeslocacaoMin: numero("margem"),
    pesos: {
      azul: numero("azul") ?? PEDIDO_OMISSAO.pesos.azul,
      vermelho: numero("vermelho") ?? PEDIDO_OMISSAO.pesos.vermelho,
      verde: numero("verde") ?? PEDIDO_OMISSAO.pesos.verde,
    },
  };
  const normal = normalizarPedido(bruto);
  if ("mensagem" in normal) throw new ErroHttp(400, "DADOS_INVALIDOS", normal.mensagem);
  return correrSimulacao(normal, idiomaAtual());
});

export const POST = api(async (ator, pedido) => {
  exigirCentral(ator);
  const corpo = await lerJson(esquemaGemeo, pedido);
  const normal = normalizarPedido(corpo);
  if ("mensagem" in normal) throw new ErroHttp(400, "DADOS_INVALIDOS", normal.mensagem);
  return correrSimulacao(normal, idiomaAtual());
});
