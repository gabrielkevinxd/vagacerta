# Digital twin and injection

Page `/gemeo` (hub only). Default seed `20261027`.

## Simulate only

In-memory Monte Carlo. Nothing is written. It compares independent calendars, a unique registry, and unique registry plus refit. `GET`/`POST /api/gemeo`.

## Inject into the app

`POST /api/gemeo/injetar` draws arrivals from the seed using the **real fleet** in the database (not the fictional simulate-only fleet). Each arrival becomes a simulated OFSC activity, fires `activityCreated`, goes through quotas, and is stored: order on a team and technician, absences on the other operators, refusals and waiting list.

The batch id is `lote-{seed}-{date}` (e.g. `lote-20261027-2026-10-26`). `GET /api/gemeo/lotes`, `GET /api/gemeo/lotes/{id}`, `DELETE /api/gemeo/lotes/{id}` (**Delete this batch**). After injection, twin and dashboard metrics come from the database so they match the Gantt, orders, history, technician agenda and integration console.

Test: `tests/gemeo-injetar.test.ts` — report totals match the batch orders. Optional script: `npx vite-node --config vitest.config.ts scripts/injetar-lote.ts`.
