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
src/proxy.ts          unsigned page traffic → /entrar
```

The engine returns a new `Mundo`. Persistence is `sincronizarMundo`. Confirming a refit plan re-runs the engine and checks an HMAC stamp (`segredo_plano`). The client never submits the movement list.

Session is the httpOnly `vc_sessao` cookie. Idle timeout: 8 hours (slides on read). Cookie lifetime: 30 days. Only `POST /api/sessao/entrar` and `POST /api/sessao/sair` write it.

UI strings live in `src/lib/i18n/pt-PT.ts` and `en.ts`. Keys must match (`tests/i18n.test.ts`). The pure engine still returns internal Portuguese; the HTTP boundary translates.
