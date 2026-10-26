# Profiles and isolation

| Role | Scope |
| --- | --- |
| Administrator and supervisor (hub) | Everything: orders, teams, travel buffer, absences, swaps, twin, integration |
| Blue / Red / Green dispatcher | List, record and booking for their operator only |
| Technician (Rui Salgado, Minho team) | Their team only, with customer and address; states `agendada → em_curso → concluída` |

On the Gantt and in a refit plan, a dispatcher sees other operators’ work as an `ocupada` block (start, end, duration). `GET` of another operator’s order returns **404**, so existence is not confirmed. Dispatchers cannot mark a team absent or request a team swap.

Technicians do not create orders or reshuffle the day. Only the hub runs the twin and confirms plans that include a swap.
