import "server-only";

/**
 * Mensagem partilhada pelas rotas `apiCentral` (cenários, saúde, reconciliar, …).
 * Tem de coincidir com `erros.soCentralIntegracao` / mapa em `motor.ts`.
 * A página `/integracao` e as APIs de vagas/reserva/consola aceitam também o despachante (D1).
 */
export const MENSAGEM_SO_CENTRAL_INTEGRACAO = "Só a central pode executar esta ação na integração OFSC.";
