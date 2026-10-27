import { traduzirLogOfsc } from "@/lib/i18n/motor";
import { apiCentral } from "@/server/http";
import { mensagensAtuais } from "@/server/idioma";
import { listarAtividades, listarLogs, listarRetries } from "@/server/ofsc/loja";
import { eOperadorOfsc } from "@/lib/ofsc/tipos";

// A consola mostra o OFSC de todos os operadores (três colunas): só a central a usa.
export const GET = apiCentral(async (_ator, pedido) => {
  const url = new URL(pedido.url);
  const depoisDe = url.searchParams.get("depoisDe") ?? undefined;
  const operador = url.searchParams.get("operador") ?? "azul";
  const mensagens = mensagensAtuais();
  return {
    // A história de cada linha foi escrita em PT quando o evento aconteceu; aqui sai no idioma do pedido.
    logs: (listarLogs(depoisDe) as { historia: string }[]).map((linha) => ({
      ...linha,
      historia: traduzirLogOfsc(mensagens, linha.historia),
    })),
    retries: listarRetries(),
    atividades: eOperadorOfsc(operador) ? listarAtividades(operador) : [],
  };
});
