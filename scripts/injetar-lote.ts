import { PEDIDO_OMISSAO } from "../src/lib/gemeo/pedido";
import { injetarLote, totaisDoLote } from "../src/server/gemeo-injetar";

const { loteId, relatorio } = await injetarLote({
  ...PEDIDO_OMISSAO,
  replicas: 1,
  semanas: 1,
  procura: 1,
});
const totais = totaisDoLote(loteId);
console.log(JSON.stringify({ loteId, totais, aceites: relatorio.politicas[0]?.aceites }, null, 2));
