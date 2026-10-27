import "server-only";

/**
 * Mensagem partilhada pelas rotas `apiCentral` (cenários, saúde, reconciliar, …).
 * A página `/integracao` e as APIs de vagas/reserva/consola aceitam também o despachante (D1).
 * O webhook OFSC e `/api/ofsc/*` autenticam só com `OFSC_WEBHOOK_SECRET`.
 */
export const MENSAGEM_SO_CENTRAL_INTEGRACAO = "Só a central pode executar esta ação.";
