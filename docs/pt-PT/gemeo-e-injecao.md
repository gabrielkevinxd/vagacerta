# Gémeo e injeção

Página `/gemeo` (só a central). Semente predefinida `20261027`.

## Só simular

Monte Carlo em memória. Não escreve na base. Compara três políticas: calendários independentes, registo único, registo único com reencaixe. `GET`/`POST /api/gemeo`.

## Injetar na aplicação

`POST /api/gemeo/injetar` gera as chegadas da semente com a **frota real** da base (não a frota fictícia do modo simular). Cada pedido cria uma atividade no OFSC simulado, dispara `activityCreated`, passa pelas quotas e fica gravado: ordem atribuída a equipa e técnico, ausências nos outros operadores, recusas e fila de espera.

O lote tem o id `lote-{semente}-{data}` (ex.: `lote-20261027-2026-10-26`). `GET /api/gemeo/lotes`, `GET /api/gemeo/lotes/{id}`, `DELETE /api/gemeo/lotes/{id}` (botão **Apagar este lote**). Depois da injeção, os indicadores do gémeo e do painel vêm da base, para coincidirem com o Gantt, as ordens, o histórico, a agenda do técnico e a consola.

Teste: `tests/gemeo-injetar.test.ts` — os totais do relatório coincidem com as ordens do lote. Script opcional: `npx vite-node --config vitest.config.ts scripts/injetar-lote.ts`.
