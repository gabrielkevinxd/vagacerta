# VagaCerta

[README em português](README.md) · [Documentation (EN)](docs/en/README.md) · [Documentação pt-PT](docs/pt-PT/README.md)

Shared scheduling prototype for field visits. Three operators — Blue, Red and Green — book work on the same teams. Each dispatcher sees and books only their operator’s orders plus aggregated free capacity. They never see another operator’s customer record.

The interface is bilingual: **European Portuguese (default)** and **English**. Use **PT | EN** in the header, on a phone, and on the sign-in screen. The choice is stored in the `vc_idioma` cookie and, when signed in, on the user account.

Full docs: [overview](docs/en/overview.md), [architecture](docs/en/architecture.md), [data model](docs/en/data-model.md), [profiles](docs/en/profiles-and-isolation.md), [engine and quotas](docs/en/engine-and-quotas.md), [OFSC](docs/en/ofsc-integration.md), [twin](docs/en/twin-and-injection.md), [xAI agent](docs/en/xai-agent.md), [run and accounts](docs/en/run-tests-and-accounts.md).

## Run

```bash
npm install
npm run dev
```

The app is at [http://127.0.0.1:4471](http://127.0.0.1:4471).

Production locally:

```bash
npm run build
npm start
```

On Windows (PowerShell), from the project folder, with Node 22:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:4471 . If the browser is stuck on “Loading this section…”, delete the `vc_sessao` and `vc_idioma` cookies for this site (or use a private window) and reload. An invalid session cookie is now cleared and `/entrar` is shown.

```powershell
npm run build
npm start
```

```bash
npm test
npm run typecheck
npm run demo:reset
```

SQLite lives at `data/vagacerta.sqlite` (Node 22 `node:sqlite`). It is created and seeded on first read.

## Demo accounts

| Profile | Email | Password |
| --- | --- | --- |
| Administrator Teresa Varela | admin@vagacerta.exemplo | vagacerta-admin |
| Supervisor Miguel Dantas | supervisor@vagacerta.exemplo | vagacerta-supervisor |
| Blue dispatcher Clara Monteiro | azul@vagacerta.exemplo | vagacerta-azul |
| Red dispatcher Gonçalo Pires | vermelho@vagacerta.exemplo | vagacerta-vermelho |
| Green dispatcher Beatriz Lamego | verde@vagacerta.exemplo | vagacerta-verde |
| Technician Rui Salgado, Minho team | tecnico.minho@vagacerta.exemplo | vagacerta-tecnico |

The rich demo day is **2026-10-27**.

## Architecture

Typed catalogues live in `src/lib/i18n/pt-PT.ts` and `src/lib/i18n/en.ts`. Components call `t("chave")`.

## i18n

Message files: `src/lib/i18n/pt-PT.ts` and `src/lib/i18n/en.ts`. Keys must match (`tests/i18n.test.ts`). Dates and numbers follow `pt-PT` or `en-GB`. API error bodies follow `vc_idioma`. The pure scheduling engine still returns internal Portuguese strings; the HTTP boundary translates them.

## Pages

`/entrar` sign-in · `/` day dashboard · `/ordens` orders · `/equipas` teams · `/otimizador` refit preview · `/definicoes` travel buffer · `/agenda` day/week Gantt · `/assistente` placeholder · `/gemeo` Monte Carlo twin · `/integracao` OFSC agent and live console.

## OFSC integration (phase 4)

Bookings are structured: zone, date, window, intervention type, technician/`resourceId`, operator id, `apptNumber`, plus OFSC location fields marked “to confirm with the operator”. Capacity is quota-based (3 installations or 8 maintenance jobs per technician per day). `/integracao` shows a live slot grid first; natural language only fills fields and never invents missing ones. The operator gets **Booking confirmed** (`PATCH` `resourceId`) or **Booking refused** (`Capacity exhausted`, `Zone closed`, `Outside the window`, `Technician unavailable`) plus an alternative. Other operators are notified with absence `POST`/`PATCH`/`DELETE` and an updated slot counter. Down platforms go to the retry queue.

Copy `.env.example` to `.env.local` and set `XAI_API_KEY`. Default `XAI_MODEL` is `grok-4.20-0309-non-reasoning`. Webhook: `POST /api/integracao/ofsc/eventos`. Simulated OFSC: `/api/ofsc/{azul|vermelho|verde}/…`. Tests mock xAI.
