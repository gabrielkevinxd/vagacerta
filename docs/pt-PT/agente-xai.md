# Agente xAI

O ecrã `/integracao` aceita texto em linguagem natural (`POST /api/integracao/agente`). O texto **só preenche campos**. Não inventa data, zona, janela nem técnico. Sem esses campos, a UI pede o que falta.

## Variáveis (`.env.local`)

Copie `.env.example` para `.env.local`. **Não commite `.env.local` nem nenhuma chave real.**

| Variável | Função |
| --- | --- |
| `XAI_API_KEY` | Chave da xAI. Vazia = modo sem IA (interpretador determinístico) |
| `XAI_MODEL` | Omissão `grok-4.20-0309-non-reasoning` |

Com chave, a chamada vai a `https://api.x.ai/v1/chat/completions` com a ferramenta `preencher_reserva_ofsc` e `max_tokens` baixo. Se a chamada falhar, cai no interpretador.

`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` são para o assistente de `/assistente`, que continua **501**. Sem essa chave o resto da aplicação corre na mesma.

Os testes **não chamam** a xAI: usam mocks (`tests/ofsc-xai.test.ts`).
