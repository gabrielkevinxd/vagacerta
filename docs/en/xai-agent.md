# xAI agent

`/integracao` accepts natural language (`POST /api/integracao/agente`). Text **only fills fields**. It does not invent date, zone, window or technician. Missing fields stay missing and the UI asks for them.

## Variables (`.env.local`)

Copy `.env.example` to `.env.local`. **Do not commit `.env.local` or any real key.**

| Variable | Role |
| --- | --- |
| `XAI_API_KEY` | xAI key. Empty = no-AI mode (deterministic parser) |
| `XAI_MODEL` | Default `grok-4.20-0309-non-reasoning` |

With a key, the call hits `https://api.x.ai/v1/chat/completions` with tool `preencher_reserva_ofsc` and a low `max_tokens`. On failure it falls back to the parser.

## Dispatch assistant (`/assistente`)

The same `XAI_API_KEY` / `XAI_MODEL` pair serves the chat. The model is non-reasoning, with a low `max_tokens`, a short history and a compact summary of the day. Tools (`consultar_operacao`, `listar_alertas`, `propor_reencaixe`) only read or choose a preview.

With no key, or if the call fails, the screen still answers: the **Proactive alerts** panel and the frequent questions are deterministic (overload, quotas, absent technicians, orders without a technician, overlaps). A sentence never saves. Confirm uses the same stamp and the same transaction as `POST /api/otimizar/confirmar`. A dispatcher only sees their operator.

`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` are unused.

Tests **do not** call xAI: they mock it (`tests/ofsc-xai.test.ts`).
