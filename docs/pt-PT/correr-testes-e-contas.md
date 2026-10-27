# Como correr, testes e contas

Requisito: **Node 22** (usa `node:sqlite`). Linux, macOS ou Windows.

```bash
npm install
npm run dev
```

Abra http://127.0.0.1:4471 . Produção local: `npm run build` e `npm start` (porta **4471**).

Windows (PowerShell), na pasta do projecto:

```powershell
npm install
npm run dev
```

Se o browser ficar em «A carregar esta secção…», apague os cookies `vc_sessao` e `vc_idioma` (ou use uma janela anónima).

```bash
npm test
npm run typecheck
npm run lint          # sem erros nem avisos
npm run demo:reset    # apaga data/vagacerta.sqlite; o próximo arranque semeia de novo
```

A base cria-se sozinha na primeira leitura. Ficheiros locais ignorados: `node_modules`, `.next`, `data/*.sqlite`, `.env*`.

## Variáveis de ambiente (opcionais)

| Variável | Função |
| --- | --- |
| `VC_DEMO_DIA` | `AAAA-MM-DD`: fixa o «dia rico» da demonstração (fim de semana → segunda-feira seguinte). Sem ela é hoje em Lisboa. Só conta quando a base é semeada: `npm run demo:reset` para a semear de novo |
| `OFSC_WEBHOOK_SECRET` | Segredo partilhado do webhook OFSC e do OFSC simulado (cabeçalho `x-vagacerta-ofsc-secret` ou `Authorization: Bearer`). Sem ela há um segredo de desenvolvimento, gerado e guardado só na base local, nunca impresso |
| `VC_DATA_DIR` | Pasta da base SQLite (omissão `data`); os testes usam uma pasta temporária |
| `XAI_API_KEY`, `XAI_MODEL`, `LLM_*` | Ver [agente xAI](agente-xai.md) |

## Testes

`npm test` (Vitest) corre o motor, o gémeo, a agenda, as chaves i18n e, desde a ronda 2 de correções: o acesso às rotas e páginas (`tests/integracao-acesso.test.ts`, `integracao-segredo.test.ts`, `proxy-acesso.test.ts`, `sessao-sair.test.ts`), a validação de ordens (zona↔área, dias passados: `ordens-validacao.test.ts`), o dia rico relativo a «hoje» e a história-estrela idêntica em qualquer dia (`demonstracao-dia.test.ts`, que inclui uma base nova semeada noutro dia), os dados fictícios (`demonstracao-dados.test.ts`) e a cobertura das traduções (`i18n-cobertura.test.ts`). Os testes fixam `VC_DEMO_DIA=2026-10-27` (ver `vitest.config.ts`) para serem determinísticos.

## Contas de demonstração

| Perfil | Correio | Palavra-passe |
| --- | --- | --- |
| Administradora Teresa Varela | admin@vagacerta.exemplo | vagacerta-admin |
| Supervisor Miguel Dantas | supervisor@vagacerta.exemplo | vagacerta-supervisor |
| Despachante Azul Clara Monteiro | azul@vagacerta.exemplo | vagacerta-azul |
| Despachante Vermelho Gonçalo Pires | vermelho@vagacerta.exemplo | vagacerta-vermelho |
| Despachante Verde Beatriz Lamego | verde@vagacerta.exemplo | vagacerta-verde |
| Técnico Rui Salgado, Equipa Minho | tecnico.minho@vagacerta.exemplo | vagacerta-tecnico |
