# Zonas = municípios e frota de 200 equipas

## Modelo

- **Zona** = município (código DICOFRE CAOP2025).
- **Área** da ordem/equipa = nome oficial do município.
- Cada equipa tem `areas` (conjunto conexo na adjacência CAOP, excepto as 7 de demonstração históricas) e `operadoresServidos` (1–3; omissão = Azul+Vermelho+Verde).
- Entre operadores servidos, a reserva do intervalo é **FCFS atómica** (`BEGIN IMMEDIATE`); o segundo perde com 409 e alternativa.

## Fontes de cobertura

| Fonte | Conteúdo | Estado |
|-------|----------|--------|
| [RNG Norte](https://norte.dstelecom.pt/rede/ambito/) | 44 concelhos | Confirmado |
| [RNG Alentejo e Algarve](https://alentejoealgarve.dstelecom.pt/rede/ambito/) | 35 concelhos | Confirmado |
| Demo VagaCerta | 13 municípios urbanos das histórias (Braga, …) | `demo-seed` |
| [Mapa de rede DST](https://www.dstelecom.pt/rede-e-cobertura/mapa-de-rede/) | ~150–153 municípios | Agregado sem lista pública de nomes |
| Zonas brancas 2025 | 288 concelhos (contratos) | Incompleto nesta entrega |

**Total catalogado nesta base:** 92 municípios (`data/zonas/municipios-caop.json` + `cobertura-dstelecom.json`).

## Adjacência

Derivada de polígonos CAOP2025 (DGT), simplificados (`maxAllowableOffset=0.002°`), método shapely touches/intersects. Ficheiro: `data/zonas/adjacencia.json`.

## Semente

- 7 equipas de demonstração (servem os 3 operadores; cenários inalterados).
- +193 equipas geradas de forma determinística (`src/lib/zonas/frota-seed.ts`, semente `20261027`): maioria serve 3; índices 0–5 do ciclo de 10 servem 1 ou 2.
- Total: **200 equipas**.
