# How to run, tests and demo accounts

Requires **Node 22** (`node:sqlite`). Linux, macOS or Windows.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4471 . Local production: `npm run build` then `npm start` (port **4471**).

Windows (PowerShell), from the project folder:

```powershell
npm install
npm run dev
```

If the browser sticks on “Loading this section…”, delete the `vc_sessao` and `vc_idioma` cookies (or use a private window).

```bash
npm test
npm run typecheck
npm run lint          # no errors, no warnings
npm run demo:reset    # deletes data/vagacerta.sqlite; next boot reseeds
```

## Environment variables (optional)

| Variable | Purpose |
| --- | --- |
| `VC_DEMO_DIA` | `YYYY-MM-DD`: pins the demo's “rich day” (a weekend moves to the following Monday). Without it, it is today in Lisbon. It only counts when the database is seeded: run `npm run demo:reset` to seed again |
| `VC_OFSC_SEGREDO` | Shared secret for the OFSC webhook and the simulated OFSC (`x-vagacerta-segredo` header or `Authorization: Bearer`). Without it there is a development secret, generated and kept in the local database only, never printed |
| `VC_DATA_DIR` | Folder of the SQLite database (default `data`); tests use a temporary folder |
| `XAI_API_KEY`, `XAI_MODEL`, `LLM_*` | See [xAI agent](xai-agent.md) |

## Tests

`npm test` (Vitest) runs the engine, the twin, the schedule, the i18n keys and, since correction round 2: access to routes and pages (`tests/integracao-acesso.test.ts`, `integracao-segredo.test.ts`, `proxy-acesso.test.ts`, `sessao-sair.test.ts`), order validation (zone↔area, past days: `ordens-validacao.test.ts`), the rich day relative to “today” and the same star story on any day (`demonstracao-dia.test.ts`, which includes a fresh database seeded on another day), the fictional data (`demonstracao-dados.test.ts`) and translation coverage (`i18n-cobertura.test.ts`). Tests pin `VC_DEMO_DIA=2026-10-27` (see `vitest.config.ts`) so they stay deterministic.

The database is created on first read. Ignored locally: `node_modules`, `.next`, `data/*.sqlite`, `.env*`.

## Demo accounts

| Profile | Email | Password |
| --- | --- | --- |
| Administrator Teresa Varela | admin@vagacerta.exemplo | vagacerta-admin |
| Supervisor Miguel Dantas | supervisor@vagacerta.exemplo | vagacerta-supervisor |
| Blue dispatcher Clara Monteiro | azul@vagacerta.exemplo | vagacerta-azul |
| Red dispatcher Gonçalo Pires | vermelho@vagacerta.exemplo | vagacerta-vermelho |
| Green dispatcher Beatriz Lamego | verde@vagacerta.exemplo | vagacerta-verde |
| Technician Rui Salgado, Minho team | tecnico.minho@vagacerta.exemplo | vagacerta-tecnico |
