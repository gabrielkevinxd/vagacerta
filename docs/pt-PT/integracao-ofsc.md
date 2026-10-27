# Integração OFSC

Contrato fechado: **só estes seis pontos**. Não há outros endpoints OFSC. Operadores: `azul`, `vermelho`, `verde`. Bucket: `DST_TELECOM`. Cada equipa partilhada tem um `resourceId` por operador (`AZ_RES_MINHO`, `VR_RES_MINHO`, `VD_RES_MINHO`, …).

## Autenticação

Nenhum ponto da integração é público.

| Rotas | Quem pode chamar |
| --- | --- |
| `POST /api/integracao/ofsc/eventos` (webhook) e `/api/ofsc/{operador}/…` (OFSC simulado) | Quem apresenta o **segredo partilhado** (`OFSC_WEBHOOK_SECRET`) — sem sessão de browser |
| `GET/POST /api/integracao/{vagas,reserva,agente,consola}` e a página `/integracao` | Central, ou **despachante só do seu operador** (técnico → 403) |
| `POST /api/integracao/{cenarios,reconciliar,saude}` | Só **sessão da central** |

- Segredo: cabeçalho `x-vagacerta-ofsc-secret: <segredo>` ou `Authorization: Bearer <segredo>`; comparação em tempo constante (`src/server/ofsc/segredo.ts`).
- Fora de produção, sem `OFSC_WEBHOOK_SECRET`, usa o valor de demonstração do `.env.example`. Em produção sem valor → 503.
- Sem credenciais ou segredo errado no webhook/simulador: 401. Sessão da central ou do despachante **não** abre essas rotas sem o segredo.
- O despachante nunca vê OFSC/JSON/logs com carga de outro operador (D1). Os cenários cross-operador ficam só da central.

## Os 6 endpoints

### 1. Webhook OFSC → VagaCerta

`POST /api/integracao/ofsc/eventos`

```json
{
  "eventType": "activityCreated",
  "operator": "azul",
  "activity": {
    "activityId": "act-…",
    "resourceId": "AZ_RES_MINHO",
    "bucket": "DST_TELECOM",
    "status": "pending",
    "date": "2026-11-03",
    "timeSlot": { "start": "10:00", "end": "12:00" },
    "workZone": "zn-n01",
    "apptNumber": "AZ-1001",
    "tipoIntervencao": "instalacao",
    "technician": "tec-rui",
    "customerName": "Ana Livre",
    "streetAddress": "Rua da Reserva 1",
    "city": "Braga",
    "postalCode": "4700-024",
    "latitude": "41.545",
    "longitude": "-8.426"
  }
}
```

`eventType` também pode ser `activityUpdated` (reagendar, cancelar). O recetor valida quotas, cria ou recusa a ordem, e responde **Reserva Confirmada** ou **Reserva Recusada**. Eventos iguais (mesmo `activityId` e assinatura) são idempotentes.

### 2. PATCH da atividade (VagaCerta → OFSC do operador de origem)

`PATCH /api/ofsc/{operador}/activities/{activityId}`

```json
{ "resourceId": "AZ_RES_MINHO" }
```

Confirma a atribuição no simulador. Também aceita `status` e `timeSlot` no fluxo interno de atualização.

### 3–5. Ausências (VagaCerta → OFSC dos outros)

`POST /api/ofsc/{operador}/resources/{resourceId}/absences`

```json
{
  "date": "2026-11-03",
  "startTime": "10:00",
  "endTime": "13:00",
  "name": "Técnico 1, 2026-11-03, instalações = 2 vagas"
}
```

`PATCH /api/ofsc/{operador}/resources/{resourceId}/absences/{id}` — ajusta o intervalo ou o nome (contador).

`DELETE /api/ofsc/{operador}/resources/{resourceId}/absences/{id}` — remove a ausência (cancelamento / reencaixe).

O sexto ponto do contrato é o **par** webhook `activityCreated` / `activityUpdated` (dois tipos no mesmo URL), mais os quatro verbos acima: PATCH atividade, POST/PATCH/DELETE ausências.

## Reserva estruturada (UI `/integracao`)

Campos obrigatórios: `zona`, `data`, `janelaInicio`, `janelaFim`, `tipoIntervencao` (`instalacao` | `manutencao` | `adicional`), `resourceId`, `operadorId`, `apptNumber`. Local OFSC (a confirmar com o operador): `customerName`, `streetAddress`, `city`, `postalCode`, `latitude`, `longitude`.

Grelha em tempo real: `GET /api/integracao/vagas`. Confirmação: `POST /api/integracao/reserva` (cria a atividade no bucket e dispara o webhook).

## Cenários (`POST /api/integracao/cenarios`)

Só a **central** corre cenários, reconciliação e saúde OFSC.

| id | O que prova |
| --- | --- |
| `vaga_livre` | Reserva Confirmada e PATCH `resourceId` |
| `capacidade_esgotada` | Quarta instalação no mesmo técnico → recusa |
| `zona_fechada` | Zona sem vigência |
| `fora_da_janela` | Janela 03:00–04:00 |
| `tecnico_indisponivel` | Cávado em formação no dia da demo |
| `reagendamento` | `activityUpdated` com nova data/janela |
| `cancelamento_reencaixe` | `status: cancelled` e libertação |
| `falta_equipa` | Ausências publicadas nos três OFSC |
| `dois_operadores` | Dois operadores no mesmo dia, recursos distintos |
| `evento_duplicado` | Segundo webhook ignorado |
| `ofsc_em_baixo` | Fila de tentativas e reconciliação |

A consola (`GET /api/integracao/consola`) tem três colunas para a central: OFSC do operador, VagaCerta, OFSC dos outros. O despachante vê **duas** colunas (OFSC do operador e VagaCerta) e **não** vê a coluna «OFSC dos outros» (D1).

Idioma: as linhas da consola («Reserva Confirmada: …», «Evento duplicado … ignorado.», «… em baixo; ficou na fila.», …) saem em português ou em inglês conforme o idioma escolhido («Booking confirmed: …», «Duplicate event …: ignored.», «… OFSC is down; queued for retry.»). O que é contrato OFSC — os JSON dos painéis `<pre>` e os valores `Reserva Confirmada`, `Reserva Recusada`, `Capacidade Esgotada`… — não se traduz. O contador da linha de confirmação aparece uma só vez: `Reserva Confirmada: AZ-1 na Equipa Minho. Inês Caldeira, 2026-11-03, instalações = 2 vagas (3 → 2)`.
