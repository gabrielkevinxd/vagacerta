# Arquitetura

```
src/lib/rules/        motor puro (sem SQLite, sem sessão)
src/lib/contratos/    tipos do assistente e do gémeo
src/lib/assistente/   alertas, regras e cliente xAI do despacho
src/lib/i18n/         catálogos pt-PT e en
src/lib/ofsc/         quotas, interpretador, cliente xAI, tipos OFSC
src/lib/demonstracao.ts
src/server/           SQLite, sessão, Zod, serviços, OFSC, injeção do gémeo
src/app/api/          rotas finas
src/app/(painel)/     páginas com sessão
src/proxy.ts          redirecciona páginas sem cookie para /entrar; 404 (ordem ou equipa alheia) e 403 (/integracao fora da central)
```

O motor devolve um `Mundo` novo. Quem grava é `sincronizarMundo`. Confirmar um plano de reencaixe volta a correr o motor e compara o selo HMAC (`segredo_plano`). O cliente não manda a lista de movimentos.

A sessão é o cookie httpOnly `vc_sessao`. Inactividade: 8 horas (desliza na leitura). Cookie: 30 dias. Só `POST /api/sessao/entrar` e `POST /api/sessao/sair` o escrevem; um `GET` a `/api/sessao/sair` responde 405 `METODO_NAO_PERMITIDO`.

O `proxy` abre a base (runtime Node) para saber, antes de a página começar a ser enviada, se a ordem ou a equipa pedida pode ser lida pelo ator (`src/server/sessao-viva.ts`). Com `cacheComponents` o Next envia primeiro o esqueleto da página e já não consegue mudar o estado HTTP, por isso o 404 («Ordem não encontrada», «Equipa não encontrada») e o 403 de `/integracao` são decididos aí e a resposta é HTML autónomo (`src/server/pagina-negada.ts`, sem eco do identificador pedido).

As rotas da integração OFSC usam (`src/server/http.ts`): `api` (qualquer sessão), `apiCentral` (administrador ou supervisor) e `apiIntegracao` (só o segredo partilhado via `src/server/ofsc/segredo.ts` / `OFSC_WEBHOOK_SECRET`).

A UI lê `src/lib/i18n/pt-PT.ts` e `en.ts`. As chaves têm de coincidir (`tests/i18n.test.ts`). O motor puro ainda devolve texto interno em português; a fronteira HTTP traduz (`src/lib/i18n/motor.ts`: erros, histórico das ordens, linhas da consola OFSC, nota do agente e plano do reencaixe). `tests/i18n-cobertura.test.ts` garante que cada código de erro e cada linha de registo tem texto em pt-PT e em inglês.

O «dia rico» da demonstração (`src/lib/demonstracao-dia.ts`) é hoje em Lisboa, ou o próximo dia útil; `VC_DEMO_DIA` fixa-o. `src/server/db.ts` grava-o ao semear (`diaDemonstracaoAtual()`) e as páginas, os atalhos e os cenários da consola usam esse valor.
