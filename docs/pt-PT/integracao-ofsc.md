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
    "customerName": "…",
    "streetAddress": "…",
    "city": "…",
    "postalCode": "…"
  }
}
```

### 2–4. OFSC simulado

`PATCH /api/ofsc/{operador}/activities/{activityId}`  
`POST /api/ofsc/{operador}/resources/{resourceId}/absences`  
`PATCH|DELETE /api/ofsc/{operador}/resources/{resourceId}/absences/{id}`

Exigem o mesmo segredo.

### 5–6. Consola e reserva (sessão)

`GET /api/integracao/vagas` · `POST /api/integracao/reserva` · `POST /api/integracao/agente` · `GET /api/integracao/consola`  
Hub-only: `POST /api/integracao/cenarios` · `reconciliar` · `saude`.
