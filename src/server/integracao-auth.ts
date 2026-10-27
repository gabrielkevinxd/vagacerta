import "server-only";

/**
 * Mensagem partilhada pelas rotas `apiCentral` (cenários, saúde, reconciliar, …).
 * O webhook OFSC e `/api/ofsc/*` autenticam só com `OFSC_WEBHOOK_SECRET`
 * (`src/server/ofsc/segredo.ts`) — não há segundo segredo nem auth por sessão nessas rotas.
 */
export const MENSAGEM_SO_CENTRAL_INTEGRACAO = "Só a central usa a integração OFSC.";
