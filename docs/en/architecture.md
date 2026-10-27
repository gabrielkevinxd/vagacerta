# Architecture

```
src/lib/rules/        pure engine (no SQLite, no session)
src/lib/contratos/    assistant and twin types
src/lib/assistente/   dispatch alerts, rules and xAI client
src/lib/i18n/         pt-PT and en catalogues
src/lib/ofsc/         quotas, parser, xAI client, OFSC types
src/lib/demonstracao.ts
src/server/           SQLite, session, Zod, services, OFSC, twin injection
src/app/api/          thin routes
src/app/(painel)/     session pages
src/proxy.ts          unsigned page traffic → /entrar; 404 (another operator's order or team) and 403 (/integracao outside the hub)
```

The engine returns a new `Mundo`. Persistence is `sincronizarMundo`. Confirming a refit plan re-runs the engine and checks an HMAC stamp (`segredo_plano`). The client never submits the movement list.

Session is the httpOnly `vc_sessao` cookie. Idle timeout: 8 hours (slides on read). Cookie lifetime: 30 days. Only `POST /api/sessao/entrar` and `POST /api/sessao/sair` write it; a `GET` of `/api/sessao/sair` answers 405 `METODO_NAO_PERMITIDO`. Expired sessions (and the assistant history linked by CASCADE) are purged only on demand — at login (`entrar`) or in `obterAtor` — never when opening the database (avoids a Blocking Route from `new Date()` during prerender). With no traffic, expired rows stay in the database.

The `proxy` opens the database (Node runtime) to learn, before the page starts streaming, whether the requested order or team can be read by the actor (`src/server/sessao-viva.ts`). With `cacheComponents` Next sends the page shell first and can no longer change the HTTP status, so the 404 (“Order not found”, “Team not found”) and the 403 of `/integracao` are decided there and the response is self-contained HTML (`src/server/pagina-negada.ts`, which never echoes the requested id).

The OFSC integration routes use (`src/server/http.ts`): `api` (any session), `apiCentral` (administrator or supervisor) and `apiIntegracao` (shared secret only via `src/server/ofsc/segredo.ts` / `OFSC_WEBHOOK_SECRET`).

UI strings live in `src/lib/i18n/pt-PT.ts` and `en.ts`. Keys must match (`tests/i18n.test.ts`). The pure engine still returns internal Portuguese; the HTTP boundary translates (`src/lib/i18n/motor.ts`: errors, order history, OFSC console lines, the agent note and the refit plan). `tests/i18n-cobertura.test.ts` guarantees that every error code and every log line has pt-PT and English text.

The demo's “rich day” (`src/lib/demonstracao-dia.ts`) is today in Lisbon, or the next working day; `VC_DEMO_DIA` pins it. `src/server/db.ts` stores it when seeding (`diaDemonstracaoAtual()`) and the pages, shortcuts and console scenarios use that value.
