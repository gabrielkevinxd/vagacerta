# xAI agent

`/integracao` accepts natural language (`POST /api/integracao/agente`). Text **only fills fields**. It does not invent date, zone, window or technician. Missing fields stay missing and the UI asks for them.

## Variables (`.env.local`)

Copy `.env.example` to `.env.local`. **Do not commit `.env.local` or any real key.**

| Variable | Role |
| --- | --- |
| `XAI_API_KEY` | xAI key. Empty = no-AI mode (deterministic parser) |
| `XAI_MODEL` | Default `grok-4.20-0309-non-reasoning` |

With a key, the call hits `https://api.x.ai/v1/chat/completions` with tool `preencher_reserva_ofsc` and a low `max_tokens`. On failure it falls back to the parser.

`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` are for `/assistente`, which is still **501**. The rest of the app runs without that key.

Tests **do not** call xAI: they mock it (`tests/ofsc-xai.test.ts`).
