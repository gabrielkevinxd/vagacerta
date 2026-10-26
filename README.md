# VagaCerta

[English README](README.en.md) · [Documentação pt-PT](docs/pt-PT/README.md) · [Documentation (EN)](docs/en/README.md)

Protótipo de agendamento partilhado de visitas técnicas. Três operadores — Azul, Vermelho e Verde — marcam trabalho nas mesmas equipas. Cada despachante vê e marca só as ordens do seu operador e a capacidade livre agregada. Nunca vê a ficha de outro operador.

A interface está em português europeu (predefinido) e inglês. O seletor **PT | EN** fica no cabeçalho, no telemóvel e no ecrã de entrada. A preferência vai no cookie `vc_idioma` e, com sessão, na conta.

Documentação completa: [visão geral](docs/pt-PT/visao-geral.md), [arquitetura](docs/pt-PT/arquitetura.md), [modelo de dados](docs/pt-PT/modelo-de-dados.md), [perfis](docs/pt-PT/perfis-e-isolamento.md), [motor e quotas](docs/pt-PT/motor-e-quotas.md), [OFSC](docs/pt-PT/integracao-ofsc.md), [gémeo](docs/pt-PT/gemeo-e-injecao.md), [agente xAI](docs/pt-PT/agente-xai.md), [correr e contas](docs/pt-PT/correr-testes-e-contas.md).

## Correr

```bash
npm install
npm run dev
```

A aplicação fica em [http://127.0.0.1:4471](http://127.0.0.1:4471).

Produção local:

```bash
npm run build
npm start
```

No Windows (PowerShell), a partir da pasta do projecto, com Node 22:

```powershell
npm install
npm run dev
```

Abra http://127.0.0.1:4471 . Se o browser ainda mostrar «A carregar esta secção…», apague os cookies `vc_sessao` e `vc_idioma` deste sítio (ou use uma janela anónima) e volte a carregar. Uma sessão inválida passa a ser apagada sozinha e mostra `/entrar`.

Para o binário de produção no Windows:

```powershell
npm run build
npm start
```

Outros comandos:

```bash
npm test          # motor, gémeo, agenda e chaves i18n (pt-PT e en)
npm run typecheck
npm run demo:reset   # apaga data/vagacerta.sqlite; o próximo arranque volta a semear
```

A base é SQLite em `data/vagacerta.sqlite` (módulo `node:sqlite` do Node 22). É criada e semeada na primeira leitura, quando a tabela de operadores está vazia. Não é preciso um serviço externo.

## Contas de demonstração

| Perfil | Correio | Palavra-passe |
| --- | --- | --- |
| Administradora Teresa Varela | admin@vagacerta.exemplo | vagacerta-admin |
| Supervisor Miguel Dantas | supervisor@vagacerta.exemplo | vagacerta-supervisor |
| Despachante Azul Clara Monteiro | azul@vagacerta.exemplo | vagacerta-azul |
| Despachante Vermelho Gonçalo Pires | vermelho@vagacerta.exemplo | vagacerta-vermelho |
| Despachante Verde Beatriz Lamego | verde@vagacerta.exemplo | vagacerta-verde |
| Técnico Rui Salgado, Equipa Minho | tecnico.minho@vagacerta.exemplo | vagacerta-tecnico |

O dia rico da demonstração é **2026-10-27**. No painel há um atalho para esse dia.

História útil para o reencaixe, com a central (administrador ou supervisor) e «Permitir uma troca de equipa»:

- Na Equipa Minho, `AZ-24081` (instalação, janela 10:00–12:00, 3 h, ocupa até às 13:00) e `VR-90001` (instalação, 09:00–12:00, 2 h 35) partilham a manhã.
- `VD-URG` está em fila de espera (FTTH, 08:00–13:00, prioridade alta, Braga). Sem troca, não cabe. Com uma troca, `VR-90001` passa para a Equipa Ave e a ordem verde entra na Minho.
- A Equipa Ave cobre Braga e Guimarães, mas não tem competência Verde. O Verde em Braga só cabe na Equipa Minho.
- A Equipa Cávado tem formação das 12:00 às 14:00 e não absorve a `VR-90001`.

Um despachante só reorganiza ordens do seu operador e não pode pedir a falta de uma equipa nem uma troca. A pré-visualização que lhe chega omite referências, clientes e moradas dos outros.

## Arquitetura

```
src/lib/rules/        motor puro, sem SQLite e sem sessão
src/lib/contratos/    tipos do assistente e do gémeo (sem implementação)
src/lib/i18n/         catálogos pt-PT e en, tipados
src/lib/demonstracao.ts   mundo de demonstração
src/server/           SQLite, sessão, esquemas Zod, serviços
src/app/api/          rotas finas
src/app/(painel)/     páginas com sessão
```

O motor devolve um `Mundo` novo. Quem grava é `sincronizarMundo`. Confirmar um plano volta a correr `reencaixar` e compara o selo HMAC (`segredo_plano` na base). O cliente não manda a lista de movimentos.

A sessão é o cookie `vc_sessao` (httpOnly). A inatividade expira ao fim de 8 horas; o cookie dura 30 dias. A expiração desliza na leitura. O cookie só é escrito em `POST /api/sessao/entrar` e `POST /api/sessao/sair`. Sem cookie, `src/proxy.ts` manda as páginas para `/entrar`. Uma sessão expirada na base continua a ser recusada na leitura.

Com `cacheComponents`, a leitura da sessão nas páginas está dentro de `Suspense`.

### Perfis

- **Administrador e supervisor** (a central): vêem tudo, gerem equipas, margem, faltas e trocas.
- **Despachante**: lista, ficha e marcação só do seu operador. Na agenda e no plano, o trabalho dos outros é um bloco `vista: "ocupada"` (início, fim, duração). Um `GET` de uma ordem alheia responde 404, para não confirmar que existe.
- **Técnico**: só a sua equipa, com cliente e morada, porque é ele que executa. Pode passar `agendada → em_curso → concluída`. Não cria ordens nem reorganiza o dia.

Estados que ocupam capacidade: `agendada`, `em_curso`, `concluida`. `em_curso` e `concluida`, e qualquer ordem com `inicioFixado`, não deslizam no recálculo. A fila é `em_espera`.

### Regra de encaixe

A janela é o intervalo em que o trabalho **pode começar**. A ocupação pode terminar depois do fim da janela. A margem de deslocação (15 min na demonstração) fica entre trabalhos, não antes do primeiro. Para uma sequência fixa, o início mais cedo é ótimo. Uma janela é opcional quando a folga de início é de 15 minutos ou menos. O resolvedor memoriza até 9 trabalhos (`limparCacheViabilidade` esvazia a cache).

O Operador Verde exige tecnologia. Desligamento só existe nos alarmes do Verde. As referências de demonstração usam os prefixos `AZ-`, `VR-` e `VD-`.

## Idiomas

A UI lê `src/lib/i18n/pt-PT.ts` e `src/lib/i18n/en.ts`. As chaves coincidem (teste em `tests/i18n.test.ts`). Datas e números usam `pt-PT` ou `en-GB`. As mensagens de API seguem o cookie `vc_idioma`. O motor puro continua a devolver texto interno em português; a fronteira HTTP traduz.

## Páginas

| Rota | Estado |
| --- | --- |
| `/entrar` | Sessão |
| `/` | Painel do dia |
| `/ordens`, `/ordens/nova`, `/ordens/:id` | Lista, criação, ficha, histórico, estados, marcação e pré-visualização |
| `/equipas`, `/equipas/:id` | Ficha, zona, horário, técnicos, indisponibilidades, minutos dos outros |
| `/otimizador` | Antes e depois textual, com selo. Não é o Gantt |
| `/definicoes` | Margem de deslocação (central) |
| `/agenda` | Gantt de dia e de semana, com arrasto, pré-visualização e lista no telemóvel |
| `/assistente` | Placeholder (`POST /api/assistente` continua 501) |
| `/gemeo` | Gémeo: só simular, ou injetar na aplicação pela semente (OFSC + quotas) |
| `/integracao` | Agente OFSC, consola em três colunas e cenários |

Em `/otimizador`, a pré-visualização faz-se com um pedido GET. Com `prever=1` o servidor chama `previsualizar` e, se o plano for viável, a confirmação envia o `selo` para `confirmarPlano`. Os parâmetros são `data`, `modo` (`encaixar`, `cancelar`, `falta`), `ordemId`, `equipaId`, `troca=1` e `motivo`. O contrato estável para os outros agentes continua a ser `POST /api/otimizar` e `POST /api/otimizar/confirmar`.

## Contrato HTTP

Pedido autenticado falhado:

```json
{ "codigo": "NAO_AUTENTICADO", "mensagem": "Inicie sessão para continuar." }
```

Códigos usados: `NAO_AUTENTICADO` (401), `SEM_PERMISSAO` (403), `NAO_ENCONTRADO` (404), `DADOS_INVALIDOS` (400), `DATA_INVALIDA`, `HORIZONTE`, `JANELA_INVALIDA`, `TECNOLOGIA_INVALIDA`, `CATEGORIA_INVALIDA`, `REFERENCIA_DUPLICADA` (409), `INVIAVEL` (409), `DESATUALIZADO` (409), `CONFLITO`, `PASSADO`, `INTERVALO`, `NAO_IMPLEMENTADO` (501), `ERRO_INTERNO` (500).

O corpo de sucesso é o recurso, ou `{ "ok": true }` quando a operação não tem mais nada a dizer.

### Sessão e catálogo

| Método | Rota | Corpo / consulta | Resposta |
| --- | --- | --- | --- |
| GET | `/api/saude` | — | `{ ok, servico }` público |
| POST | `/api/sessao/entrar` | `{ email, palavraPasse }` | `{ ator }` |
| POST | `/api/sessao/sair` | — | `{ ok: true }` |
| GET | `/api/sessao` | — | `{ ator }` |
| GET | `/api/catalogo` | — | operadores, categorias, tecnologias, janelas |
| GET | `/api/zonas` | — | `{ id, codigo, nome, regiao }[]` |
| GET | `/api/definicoes` | — | `{ margemDeslocacaoMin }` |
| PUT | `/api/definicoes` | `{ margemDeslocacaoMin }` | o mesmo, depois de recalcular |

`Ator`: `{ id, nome, papel, operadorId, tecnicoId, equipaId }`. `papel` é `administrador | supervisor | despachante | tecnico`.

### Ordens

`OrdemVista` (o que a API devolve; não inclui dados de outro operador para o despachante):

```ts
{
  id, referencia, operadorId, operadorNome, estado, estadoRotulo,
  prioridade, categoria, tecnologia, data, janelaInicio, janelaFim,
  duracaoMin, inicioPlaneado, fimPlaneado, inicioFixado,
  equipaId, equipaNome, area, zonaId, zonaNome,
  clienteNome, clienteContacto, morada, nota,
  motivoCancelamento, quemPediu
}
```

| Método | Rota | Notas |
| --- | --- | --- |
| GET | `/api/ordens` | `estado`, `operador` (só central), `data`, `de`, `ate`, `q`, `equipaId` |
| POST | `/api/ordens` | ver corpo abaixo |
| GET | `/api/ordens/:id` | `{ ordem, historico }`. 404 se o ator não puder ler |
| PATCH | `/api/ordens/:id` | ficha: cliente, contacto, morada, nota, prioridade |
| POST | `/api/ordens/:id/cancelar` | `{ motivo, quemPediu? }` sem reencaixe |
| POST | `/api/ordens/:id/estado` | `{ estado, motivo?, quemPediu? }` |
| POST | `/api/ordens/:id/marcar` | `{ equipaId? }` para `pendente` ou `em_espera` |
| POST | `/api/ordens/:id/reagendar` | campos opcionais abaixo |

Corpo de criação:

```ts
{
  operadorId: "azul" | "vermelho" | "verde";
  referencia: string;
  area: string;          // uma localidade de AREAS
  zonaId: string;
  categoria: "instalacao" | "suporte" | "adicional" | "desligamento";
  tecnologia: "FTTH" | "CABO" | "DTH" | "SEA" | "ALARMES" | null;
  data: "AAAA-MM-DD";
  janelaInicio: "HH:MM";
  janelaFim: "HH:MM";
  prioridade: "alta" | "media" | "baixa";
  clienteNome, clienteContacto, morada, nota;
  equipaId?: string | null;
  modo: "agendar" | "espera" | "pendente";
}
```

Reagendar: `{ equipaId?, data?, janelaInicio?, janelaFim?, inicioPlaneado?: "HH:MM" | null }`. `inicioPlaneado` com hora fixa o início dentro da janela. `null` liberta o início.

O despachante não marca para além do horizonte do operador (Azul e Vermelho 15 dias, Verde 21) nem em dias passados.

### Equipas

| Método | Rota | Corpo |
| --- | --- | --- |
| GET | `/api/equipas` | resumo, sem membros |
| GET | `/api/equipas/:id?data=` | ficha, membros, competências, horário, indisponibilidades, `ocupacaoHoje` |
| PATCH | `/api/equipas/:id` | `{ ativa?, areas?, horarios?, competencias? }` só a central |
| POST | `/api/equipas/:id/membros` | `{ nome }` |
| DELETE | `/api/equipas/:id/membros/:tecnicoId` | desativa |
| POST | `/api/equipas/:id/indisponibilidades` | `{ data, inicio, fim, motivo }` — 409 se partir o dia |
| DELETE | `/api/equipas/:id/indisponibilidades/:indisponibilidadeId` | recalcula o dia |
| POST | `/api/equipas/:id/zona` | `{ zonaId, inicio, fim, confirmacao? }` |

`ocupacaoHoje.proprias` são as ordens que o ator pode ler. `minutosOutros` é a ocupação que ele não pode abrir. O técnico de outra equipa recebe 404.

`horarios[]`: `{ diaSemana, inicio, fim }` com `diaSemana` de 1 (segunda) a 7 (domingo). O PATCH substitui a semana.

`competencias[]`: `{ operadorId, categorias, tecnologias }`.

A vigência da zona é inclusiva. Repetir um período já coberto não altera nada. Um início no passado exige `confirmacao: true` (`PASSADO` se faltar).

### Vagas, agenda e reencaixe

`GET /api/vagas?operadorId&data&area&categoria&tecnologia`

Devolve `PublicacaoVagas`: duração, margem e `janelas[]` com `estado` `disponivel | opcional | indisponivel`, `equipasLivres` e o estado por equipa. Não inclui ordens de outros operadores.

`GET /api/agenda?de=&ate=` — no máximo 15 dias. Resposta `Agenda`:

```ts
{
  de, ate, margemDeslocacaoMin,
  dias: { data, equipas: LinhaVista[] }[]
}

LinhaVista = {
  equipaId, nome, codigo,
  turno: { inicio, fim } | null,
  indisponibilidades: { inicio, fim, inicioMin, fimMin, motivo }[],
  blocos: BlocoVista[],
  conflitos: { ordemId, mensagem }[]
}

BlocoVista = {
  id, inicio, fim, inicioMin, fimMin, duracaoMin,
  vista: "completa" | "ocupada",
  arrastavel: boolean,
  referencia?, operadorId?, clienteNome?, morada?,
  janelaInicio?, janelaFim?, categoria?, estado?, prioridade?
}
```

Um bloco `ocupada` não traz referência, cliente, morada nem operador. O Gantt deve tratar `arrastavel` e gravar com `reagendar`. Os conflitos já vêm filtrados para o que o ator pode conhecer.

`POST /api/otimizar` pré-visualiza. `POST /api/otimizar/confirmar` grava se o selo bater certo.

```ts
PedidoRealocacao = {
  cancelarId?: string;
  encaixarId?: string;
  equipaEmFalta?: string;     // só a central
  permitirTroca?: boolean;    // a central; o despachante é forçado a false
  apenasReferencias?: string[];
  motivo?: string;
  data?: string;              // obrigatório na prática para a falta
}

PlanoVista = {
  viavel, mensagem, data, selo,
  movimentos: { tipo, referencia, ordemId, deEquipaId, paraEquipaId, motivo }[],
  antes: LinhaVista[],
  depois: LinhaVista[]
}
```

`tipo` do movimento: `cancelar | reagendar | encaixar | devolver`. Para o despachante, um movimento alheio chega com `referencia: "Outro operador"` e `ordemId` vazio. O selo é calculado no servidor sobre a impressão completa, por isso a confirmação não precisa dos identificadores ocultos.

Confirmar:

```json
{ "pedido": { "...o mesmo pedido da pré-visualização..." }, "selo": "hex do plano" }
```

Se o mundo mudou, a resposta é 409 `DESATUALIZADO`. `aplicarPlano` não volta a validar: a rota de confirmação é que reexecuta `reencaixar`.

Sem `cancelarId`, `encaixarId` ou `equipaEmFalta`, o motor responde que não há nada a reorganizar. Não existe um varrimento cego da fila.

## Funções do motor

Importar de `@/lib/rules`. Nenhuma destas funções abre a base.

| Função | Contrato |
| --- | --- |
| `duracaoMinutos(operadorId, categoria, tecnologia)` | `number \| null` |
| `janelasDe(operadorId, categoria)` | janelas de início do catálogo |
| `corresponderJanela(...)` | a janela exacta, ou `undefined` |
| `validarCatalogo(...)` | `{ duracaoMin }` ou `Falha` (`ok: false`) |
| `inicioMaisCedo(trabalho, prontoEm, restricoes)` | minuto ou `null` |
| `resolverSequencia(trabalhos, restricoes)` | plano ou `null` se inviável |
| `sequenciaViavel(...)` | boolean |
| `limparCacheViabilidade()` | esvazia a memoização |
| `recalcularDia(mundo, equipaId, data)` | `Mundo` com inícios mais cedo |
| `diaAceita(mundo, equipaId, data, extra?)` | a sequência cabe |
| `marcarOrdem(mundo, entrada, id?)` | `Resultado<Ordem>` |
| `agendarExistente(mundo, id, equipaId?)` | tira a ordem e volta a marcá-la |
| `cancelarOrdem(mundo, id, motivo, quemPediu?)` | não puxa a fila |
| `reagendarOrdem(mundo, id, alteracao)` | `Resultado<Ordem>` |
| `detetarConflitos(mundo, equipaId, data)` | sobreposições e janelas partidas |
| `utilizacaoDoDia(mundo, data)` | minutos e percentagem, com `porOperador` |
| `proporVagas(mundo, consulta)` | `PublicacaoVagas` |
| `linhasDoDia(mundo, data)` | blocos por equipa, sem filtro de perfil |
| `reencaixar(mundo, pedido)` | `PlanoReencaixe & { mundo }` |
| `impressaoPlano(movimentos)` | string estável que o servidor sela |
| `aplicarPlano(mundo, plano)` | usa `plano.mundo` se vier preenchido |
| `projetarAgenda(mundo, ator, de, ate)` | `Agenda` já filtrada |
| `projetarPlano(antes, depois, plano, ator, selo)` | `PlanoVista` |
| `atribuirPeriodo(periodos, novo, { hoje, confirmacao? })` | corta, parte e funde |
| `vigenteEm(periodos, data)` | o período que cobre a data |
| `podeLerOrdem`, `podeMarcarOperador`, `podeVerEquipa`, `podeGerirEquipas`, `podeReencaiarGlobal`, `podeCancelar`, `podeReagendar`, `podeMudarEstado`, `vistaDaOrdem` | permissões puras |

`Resultado<T>` é `{ ok: true, mundo, resultado } | { ok: false, codigo, mensagem }`. O sucesso do catálogo **não** tem `ok`; distingue-se com `"ok" in valor`.

`Trabalho` do resolvedor usa minutos desde a meia-noite: `{ id, janelaInicio, janelaFim, duracao }`. `Restricoes`: `{ inicioTurno, fimTurno, blocos, margemDeslocacaoMin }`.

Uma falta (`equipaEmFalta`) acrescenta indisponibilidade do turno (`un-falta-<equipaId>-<data>`), tenta mover as visitas `agendada` e devolve à fila as que não cabem. Não cancela em bloco.

## O que os outros agentes usam

### Gantt (`/agenda`)

A rota já desenha o dia e a semana. No telemóvel a mesma rota é uma lista por equipa. O arrasto, quando o browser o permite, pede `POST /api/ordens/:id/reagendar/prever` com o corpo de `reagendar` (`equipaId`, `data`, `inicioPlaneado`). A página também pré-visualiza com `GET /agenda?prever=1&ordem=&equipaId=&dia=&inicio=`. A resposta do POST é `{ mensagem, ordem, depois }`, em que `depois` é uma `Agenda` só dos dias tocados, já filtrada pelo perfil. `POST /api/ordens/:id/reagendar` é que grava. Se o mundo mudou entretanto, a gravação devolve o erro do motor e o ecrã repõe a agenda anterior.

Cores: `COR_OPERADOR` (`#1d4f91`, `#a32020`, `#1d7a45`). Um bloco `ocupada` não usa estas cores.

### Assistente (`/assistente`)

Tipos em `src/lib/contratos/assistente.ts`: `PedidoAssistente`, `IntencaoDespacho`, `RespostaAssistente`.

- `POST /api/assistente` e `GET /api/assistente` respondem 501 `{ pronto: false, codigo: "NAO_IMPLEMENTADO", mensagem, contrato }`.
- A intenção `reencaixar` tem de produzir um `PedidoRealocacao` e chamar `POST /api/otimizar`. Só `POST /api/otimizar/confirmar` grava.
- Sem `LLM_API_KEY` (ver `.env.example`), o fallback é determinístico. A chave não é obrigatória para o resto da aplicação.

### Gémeo (`/gemeo`)

Tipos em `src/lib/contratos/gemeo.ts`: `PedidoGemeo`, `MetricasPolitica`, `RelatorioGemeo`. Semente `SEMENTE_GEMEO = 20261027`.

`GET` e `POST /api/gemeo` (só a central) devolvem `RelatorioGemeo`. O corpo do POST é `PedidoGemeo`:

```ts
{
  semente?: number;            // omissão 20261027
  semanas?: number;            // 1–4
  replicas?: number;           // 1–8
  procura?: number;            // 0,5–2
  probabilidadeFalta?: number; // 0–0,5
  margemDeslocacaoMin?: number;
  pesos?: { azul: number; vermelho: number; verde: number }
}
```

O modo **Só simular** não escreve na base. Compara `independente`, `partilhada` e `reencaixe` com `diaAceita` / `resolverSequencia`.

O modo **Injetar na aplicação** (`POST /api/gemeo/injetar`) gera as chegadas da semente com a frota real da base, cria atividades no OFSC simulado de cada operador, dispara `activityCreated`, valida quotas, grava ordens, ausências nos outros operadores, recusas e fila de espera, e marca tudo com um lote `lote-{semente}-{data}`. `DELETE /api/gemeo/lotes/{id}` apaga o lote. Depois da injeção, os indicadores do gémeo e do painel vêm da base.

Tabelas extra: `lotes_simulacao`, `lote_recusas`; coluna `lote_id` em `ordens`, `ofsc_atividades`, `ofsc_ausencias`, `indisponibilidades`.

## Modelo de dados

Tabelas: `operadores`, `utilizadores`, `sessoes`, `regioes`, `zonas`, `ccos`, `equipas`, `equipa_zona`, `tecnicos`, `competencias`, `horarios`, `indisponibilidades`, `ordens` (única por operador e referência), `historico_ordens`, `definicoes`, `auditoria`, `ofsc_recursos`, `ofsc_atividades`, `ofsc_ausencias`, `ofsc_saude`, `integracao_eventos`, `integracao_retries`, `integracao_logs`, `lotes_simulacao`, `lote_recusas`.

## Integração OFSC (fase 4)

A reserva é estruturada. Cada pedido leva `zona` (workZone), `data`, `janela` (início e fim), `tipoIntervencao` (`instalacao` | `manutencao` | `adicional`), `tecnico`/`resourceId`, `operadorId` e `apptNumber`, mais os campos OFSC de local (`customerName`, `streetAddress`, `city`, `postalCode`, `latitude`, `longitude`) marcados na UI como «campos a confirmar com o operador». A correspondência é por zona, data, janela, tipo e técnico.

A capacidade é por quotas: 3 instalações ou 8 manutenções por técnico e por dia (1 instalação ≡ 8/3 manutenções). A grelha mostra o contador **N → N-1**.

Resposta ao operador: **Reserva Confirmada** (`PATCH` com `resourceId`) ou **Reserva Recusada** com motivo `Capacidade Esgotada`, `Zona Fechada`, `Fora da janela` ou `Técnico indisponível`, e uma alternativa. A notificação aos outros é `POST`/`PATCH`/`DELETE` de ausências mais o contador, por exemplo `Técnico 1, 2026-10-27, instalações = 0 vagas`. Plataforma em baixo → fila de novas tentativas.

Contrato OFSC (não há outros endpoints OFSC):

- Saída OFSC → VagaCerta: `POST /api/integracao/ofsc/eventos` com `activityCreated` ou `activityUpdated` (atividade no bucket `DST_TELECOM`).
- Entrada VagaCerta → OFSC simulado, por operador (`azul` | `vermelho` | `verde`):
  - `PATCH /api/ofsc/{operador}/activities/{activityId}` (`resourceId`)
  - `POST /api/ofsc/{operador}/resources/{resourceId}/absences`
  - `PATCH /api/ofsc/{operador}/resources/{resourceId}/absences/{id}`
  - `DELETE /api/ofsc/{operador}/resources/{resourceId}/absences/{id}`

Cada equipa partilhada tem um `resourceId` distinto em cada operador (`AZ_RES_MINHO`, `VR_RES_MINHO`, `VD_RES_MINHO`, …).

Em `/integracao` escolhe-se primeiro a vaga na grelha (tempo real: `GET /api/integracao/vagas`) e depois confirma-se (`POST /api/integracao/reserva`). O texto em linguagem natural (`POST /api/integracao/agente`) só preenche campos; não inventa data, zona, janela nem técnico.

### Agente do operador e chave xAI

1. Copie `.env.example` para `.env.local`.
2. Preencha `XAI_API_KEY` (chave da xAI). Sem chave, ou se a chamada falhar, o ecrã `/integracao` usa o interpretador determinístico e mostra **modo sem IA**.
3. `XAI_MODEL` por omissão: `grok-4.20-0309-non-reasoning`.
4. `npm run dev` e abra `/integracao`.

A chamada vai a `https://api.x.ai/v1/chat/completions` com a ferramenta `preencher_reserva_ofsc` e `max_tokens` baixo. Os testes não chamam a xAI: usam mocks.

### Arquivo

```bash
tar -czf vagacerta.tar.gz --exclude=node_modules --exclude=.next --exclude='*.db*' --exclude='*.sqlite*' --exclude=data .
```

As palavras-passe de demonstração ficam com scrypt. Não estão em claro na base.
