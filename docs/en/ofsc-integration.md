# OFSC integration

Closed contract: **these six surfaces only**. No other OFSC endpoints. Operators: `azul`, `vermelho`, `verde`. Bucket: `DST_TELECOM`. Each shared team has one `resourceId` per operator (`AZ_RES_MINHO`, `VR_RES_MINHO`, `VD_RES_MINHO`, …).

## The 6 endpoints

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

`eventType` may also be `activityUpdated` (reschedule, cancel). The receiver checks quotas, creates or refuses the order, and answers **Reserva Confirmada** or **Reserva Recusada**. Matching `activityId` + signature is idempotent.

### 2. PATCH activity (VagaCerta → originating OFSC)

`PATCH /api/ofsc/{operador}/activities/{activityId}`

```json
{ "resourceId": "AZ_RES_MINHO" }
```

Confirms the assignment on the simulator. Internal updates may also send `status` and `timeSlot`.

### 3–5. Absences (VagaCerta → the other OFSC instances)

`POST /api/ofsc/{operador}/resources/{resourceId}/absences`

```json
{
  "date": "2026-11-03",
  "startTime": "10:00",
  "endTime": "13:00",
  "name": "Técnico 1, 2026-11-03, instalações = 2 vagas"
}
```

`PATCH /api/ofsc/{operador}/resources/{resourceId}/absences/{id}` — interval or counter name.

`DELETE /api/ofsc/{operador}/resources/{resourceId}/absences/{id}` — drop the absence (cancel / refit).

The sixth surface is the webhook’s second event type (`activityUpdated`) on the same URL, together with the four verbs above.

## Structured booking (`/integracao`)

Required: `zona`, `data`, `janelaInicio`, `janelaFim`, `tipoIntervencao` (`instalacao` | `manutencao` | `adicional`), `resourceId`, `operadorId`, `apptNumber`. OFSC location (to confirm with the operator): `customerName`, `streetAddress`, `city`, `postalCode`, `latitude`, `longitude`.

Live grid: `GET /api/integracao/vagas`. Confirm: `POST /api/integracao/reserva`.

## Scenarios (`POST /api/integracao/cenarios`)

| id | What it proves |
| --- | --- |
| `vaga_livre` | Booking confirmed and `resourceId` PATCH |
| `capacidade_esgotada` | Fourth installation on the same technician → refuse |
| `zona_fechada` | Zone with no validity |
| `fora_da_janela` | Window 03:00–04:00 |
| `tecnico_indisponivel` | Cávado training on the demo day |
| `reagendamento` | `activityUpdated` with a new date/window |
| `cancelamento_reencaixe` | `status: cancelled` and release |
| `falta_equipa` | Absences posted to all three OFSC instances |
| `dois_operadores` | Two operators, same day, distinct resources |
| `evento_duplicado` | Second webhook ignored |
| `ofsc_em_baixo` | Retry queue and reconcile |

The console (`GET /api/integracao/consola`) has three columns: originating OFSC, VagaCerta, other OFSC instances.
