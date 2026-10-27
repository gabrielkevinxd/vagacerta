# Zones = municipalities and 200-team fleet

## Model

- **Zone** = municipality (CAOP2025 DICOFRE code).
- Order/team **area** = official municipality name.
- Each team has connected `areas` (CAOP adjacency; 7 demo teams keep historical sets) and `operadoresServidos` (1–3; default all three).
- Among served operators, slot reserve is **atomic FCFS** (`BEGIN IMMEDIATE`); the loser gets 409 with an alternative.

## Coverage sources

| Source | Content | Status |
|--------|---------|--------|
| [RNG Norte](https://norte.dstelecom.pt/rede/ambito/) | 44 municipalities | Confirmed |
| [RNG Alentejo e Algarve](https://alentejoealgarve.dstelecom.pt/rede/ambito/) | 35 municipalities | Confirmed |
| VagaCerta demo | 13 urban municipalities from demo stories | `demo-seed` |
| [DST network map](https://www.dstelecom.pt/rede-e-cobertura/mapa-de-rede/) | ~150–153 municipalities | Aggregate without public name list |
| White zones 2025 | 288 municipalities (contracts) | Incomplete in this delivery |

**Catalogued here:** 92 municipalities under `data/zonas/`.

## Seed

7 demo teams (all serve 3 operators) + 193 deterministic extras = **200 teams**.
