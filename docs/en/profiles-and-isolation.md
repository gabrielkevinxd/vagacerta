# Profiles and isolation

| Role | Scope |
| --- | --- |
| Administrator and supervisor (hub) | Everything: orders, teams, travel buffer, absences, swaps, twin, OFSC integration (`/integracao`, `/api/integracao/*`: hub only) |
| Blue / Red / Green dispatcher | List, record and booking for their operator only |
| Technician (Rui Salgado, Minho team) | Their team only, with customer and address; states `agendada → em_curso → concluída` |

On the Gantt and in a refit plan, a dispatcher sees other operators’ work as an `ocupada` block (start, end, duration). `GET` of another operator’s order returns **404**, so existence is not confirmed. Dispatchers cannot mark a team absent or request a team swap.

Technicians do not create orders or reshuffle the day. Only the hub runs the twin and confirms plans that include a swap.

Pages follow the same rule: `/ordens/:id` and `/equipas/:id` that the actor cannot read show the “not found” page in the chosen language with HTTP status **404** (the same for “another operator's” and “does not exist”). `/integracao` and `/api/integracao/*` answer **403** to a dispatcher or a technician and **401** without a session. The OFSC webhook and the simulated OFSC also accept the integration secret (see [OFSC integration](ofsc-integration.md)).
