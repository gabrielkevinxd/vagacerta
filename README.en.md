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
npm test              # engine, twin, schedule, access rules, 404s, rich day and translation coverage
npm run typecheck
npm run lint          # no errors, no warnings
npm run demo:reset    # deletes data/vagacerta.sqlite; the next start seeds again
```

SQLite lives at `data/vagacerta.sqlite` (Node 22 `node:sqlite`). It is created and seeded on first read.

Environment variables (all optional; see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `VC_DEMO_DIA` | `YYYY-MM-DD`. Pins the demo's “rich day” (see “Demo accounts”). Without it, the rich day is today in Lisbon |
| `OFSC_WEBHOOK_SECRET` | Shared secret for the OFSC webhook and the simulated OFSC (`x-vagacerta-ofsc-secret` or Bearer). Outside production, defaults to the demo value in `.env.example`; in production unset → 503 |
| `VC_DATA_DIR` | Folder of the SQLite database (default `data`) |
| `XAI_API_KEY`, `XAI_MODEL` | The operator agent in `/integracao` |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | Assistant (not wired yet) |

## Demo accounts

| Profile | Email | Password |
| --- | --- | --- |
| Administrator Teresa Varela | admin@vagacerta.exemplo | vagacerta-admin |
| Supervisor Miguel Dantas | supervisor@vagacerta.exemplo | vagacerta-supervisor |
| Blue dispatcher Clara Monteiro | azul@vagacerta.exemplo | vagacerta-azul |
| Red dispatcher Gonçalo Pires | vermelho@vagacerta.exemplo | vagacerta-vermelho |
| Green dispatcher Beatriz Lamego | verde@vagacerta.exemplo | vagacerta-verde |
| Technician Rui Salgado, Minho team | tecnico.minho@vagacerta.exemplo | vagacerta-tecnico |

The **rich demo day** is **today** (`Europe/Lisbon`); on a Saturday or Sunday it is the following Monday. There is no fixed date: the story below always happens “today”. `VC_DEMO_DIA=YYYY-MM-DD` pins the day (reproducible tests and recordings; a weekend date moves forward the same way). The dashboard has a shortcut to that day.

The rich day is stored in the database when it is seeded (`definicoes.dia_demonstracao`) and every demo date is relative to it. A database seeded on one day keeps that day: run `npm run demo:reset` to get “today” again. The data is obviously fictional: phones `900 000 0xx`, addresses “Rua Exemplo N, <city>”. The twin's horizon starts on the Monday of the rich day's week, so the twin's numbers are the same in any week.

Useful refit story, as the hub (administrator or supervisor) with “Allow a team swap”: in Equipa Minho, `AZ-24081` and `VR-90001` share the morning; `VD-URG` waits in the queue (FTTH, 08:00–13:00, high priority, Braga) and does not fit without a swap. With one swap, `VR-90001` moves to Equipa Ave and the green order takes the Minho slot.

## Architecture

Typed catalogues live in `src/lib/i18n/pt-PT.ts` and `src/lib/i18n/en.ts`. Components call `t("chave")`.

## i18n

Message files: `src/lib/i18n/pt-PT.ts` and `src/lib/i18n/en.ts`. Keys must match (`tests/i18n.test.ts`). Dates and numbers follow `pt-PT` or `en-GB`. API error bodies follow `vc_idioma`. The pure scheduling engine still returns internal Portuguese strings; the HTTP boundary translates them.

That translation lives in `src/lib/i18n/motor.ts` (`traduzirMensagem`, `traduzirHistoria`, `traduzirLogOfsc`, `traduzirNarrativa`): every engine and server error code (`erros.*`, `motor.*`), every order-history line, every line of the integration console (`ofsc.log.*`, e.g. “Reserva Confirmada: …” → “Booking confirmed: …”), the booking result, the agent's note (“Modo sem IA — …” → “No-AI mode — …”) and the refit plan (“Encaixar VD-URG não cabe: …” → “Fitting VD-URG in does not work: …”). In Portuguese the text comes out exactly as the engine wrote it. `tests/i18n-cobertura.test.ts` scans the code and fails if an error or log sentence has no Portuguese **and** English text. The console's JSON panels (`<pre>`) show the OFSC contract as it travels and stay in Portuguese (values such as `Reserva Confirmada` and `Capacidade Esgotada` are part of that contract).

Order and team pages answer 404 with a localised “Order not found” / “Team not found” page when the actor cannot read them (the `proxy` decides before the page starts streaming); `/integracao` answers 403 to anyone outside the hub. `POST /api/sessao/sair` ends the session; a `GET` of that address answers 405 `METODO_NAO_PERMITIDO`. The zone of a new order must serve its area (400 `DADOS_INVALIDOS` otherwise, listing the possible zones); a dispatcher cannot book a past day (400 `PASSADO`), and an agenda range longer than 15 days or reversed is `INTERVALO`.

## Pages

`/entrar` sign-in · `/` day dashboard · `/ordens` orders · `/equipas` teams · `/otimizador` refit preview · `/definicoes` travel buffer · `/agenda` day/week Gantt · `/assistente` chat and proactive alerts · `/gemeo` Monte Carlo twin · `/integracao` OFSC agent and live console (hub + dispatcher for their own operator; technician blocked).

## OFSC integration (phase 4)

Bookings are structured: zone, date, window, intervention type, technician/`resourceId`, operator id, `apptNumber`, plus OFSC location fields marked “to confirm with the operator”. Capacity is quota-based (3 installations or 8 maintenance jobs per technician per day). `/integracao` shows a live slot grid first; natural language only fills fields and never invents missing ones. The operator gets **Booking confirmed** (`PATCH` `resourceId`) or **Booking refused** (`Capacity exhausted`, `Zone closed`, `Outside the window`, `Technician unavailable`) plus an alternative. Other operators are notified with absence `POST`/`PATCH`/`DELETE` and an updated slot counter. Down platforms go to the retry queue.

Copy `.env.example` to `.env.local` and set `XAI_API_KEY`. Default `XAI_MODEL` is `grok-4.20-0309-non-reasoning`. Webhook: `POST /api/integracao/ofsc/eventos`. Simulated OFSC: `/api/ofsc/{azul|vermelho|verde}/…`. Tests mock xAI.

### Integration authentication

Nothing in the OFSC integration is public.

| Routes | Who may call |
| --- | --- |
| `POST /api/integracao/ofsc/eventos` (webhook) and `/api/ofsc/{operator}/…` (simulated OFSC) | Whoever presents the **shared secret** (`OFSC_WEBHOOK_SECRET`) — no browser session |
| `GET/POST /api/integracao/{vagas,reserva,agente,consola}` and the `/integracao` page | Hub, or a **dispatcher for their own operator** (technician → 403) |
| `POST /api/integracao/{cenarios,reconciliar,saude}` | **Hub session** only |

- The secret goes in the `x-vagacerta-ofsc-secret: <secret>` header or in `Authorization: Bearer <secret>`. It is compared in constant time.
- Outside production, missing `OFSC_WEBHOOK_SECRET` falls back to the demo value in `.env.example`. In production, unset → 503.
- No credentials or a wrong secret on webhook/simulator: 401. A hub or dispatcher session without the secret does **not** open those routes.
- Dispatchers never see another operator's OFSC JSON, logs with payloads, or retries body (D1). Hub scenarios remain cross-operator and hub-only.
