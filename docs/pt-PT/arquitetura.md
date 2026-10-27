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
src/proxy.ts          redirecciona páginas sem cookie para /entrar
```

O motor devolve um `Mundo` novo. Quem grava é `sincronizarMundo`. Confirmar um plano de reencaixe volta a correr o motor e compara o selo HMAC (`segredo_plano`). O cliente não manda a lista de movimentos.

A sessão é o cookie httpOnly `vc_sessao`. Inactividade: 8 horas (desliza na leitura). Cookie: 30 dias. Só `POST /api/sessao/entrar` e `POST /api/sessao/sair` o escrevem.

A UI lê `src/lib/i18n/pt-PT.ts` e `en.ts`. As chaves têm de coincidir (`tests/i18n.test.ts`). O motor puro ainda devolve texto interno em português; a fronteira HTTP traduz.
