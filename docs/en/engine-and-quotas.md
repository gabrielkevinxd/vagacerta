# Engine and quotas

## Engine (`src/lib/rules`)

The **window** is when the job **may start**. Occupancy may end after the window. The travel buffer (15 min in the demo) sits **between** jobs, not before the first. For a fixed sequence, the earliest start is optimal. A window is optional when start slack is 15 minutes or less.

`resolverSequencia` / `diaAceita` decide whether visits fit the shift, given hours, zone validity and unavailability. Green requires a technology. Disconnection exists only on Green alarms.

Refit tries to move an already booked visit to the other team in the area when the day no longer closes.

## OFSC quotas

Per technician per day: **3 installations** or **8 maintenance jobs** (`1 installation ≡ 8/3 maintenance`). `adicional` also consumes units. The `/integracao` grid shows **N → N-1**.

Refusal reasons: `Capacidade Esgotada`, `Zona Fechada`, `Fora da janela`, `Técnico indisponível`.
