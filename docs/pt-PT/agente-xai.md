# Agente xAI

O ecrã `/integracao` aceita texto em linguagem natural (`POST /api/integracao/agente`). O texto **só preenche campos**. Não inventa data, zona, janela nem técnico. Sem esses campos, a UI pede o que falta.

## Variáveis (`.env.local`)

Copie `.env.example` para `.env.local`. **Não commite `.env.local` nem nenhuma chave real.**

| Variável | Função |
| --- | --- |
| `XAI_API_KEY` | Chave da xAI. Vazia = modo sem IA (interpretador determinístico) |
| `XAI_MODEL` | Omissão `grok-4.20-0309-non-reasoning` |

Com chave, a chamada vai a `https://api.x.ai/v1/chat/completions` com a ferramenta `preencher_reserva_ofsc` e `max_tokens` baixo. Se a chamada falhar, cai no interpretador.

## Assistente de despacho (`/assistente`)

O mesmo par `XAI_API_KEY` / `XAI_MODEL` serve o chat. O modelo é não-reasoning, com `max_tokens` baixo, histórico curto e um resumo compacto do dia. As ferramentas (`consultar_operacao`, `listar_alertas`, `propor_reencaixe`) só leem ou escolhem uma pré-visualização.

Sem chave, ou se a chamada falhar, o ecrã continua a responder: o painel **Alertas proativos** e as perguntas frequentes são determinísticos (sobrelotação, quotas, técnicos ausentes, ordens sem técnico, sobreposições). Nunca grava por uma frase. Confirmar chama o mesmo selo e a mesma transação de `POST /api/otimizar/confirmar`. O despachante só vê o seu operador.

`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` não são usadas.

Os testes **não chamam** a xAI: usam mocks (`tests/ofsc-xai.test.ts`).
