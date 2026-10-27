# Zones = municipalities and 200-team fleet

## Model

- **Zone** = municipality (CAOP2025 DICOFRE code).
- Order/team **area** = official municipality name.
- Each team has connected `areas` (CAOP adjacency; 7 demo teams keep historical sets) and `operadoresServidos` (1–3; default all three).
- Among served operators, slot reserve is **atomic FCFS** (`BEGIN IMMEDIATE`); the loser gets 409 with an alternative.

## Coverage sources

| Source | Content | Status |
|--------|---------|--------|
| [Network map API](https://www.dstelecom.pt/wp-json/mapa-rede/v1/concelhos) (`concelhos_a`) | 154 municipalities | **Confirmed** (full public source) |
| [Network map (site)](https://www.dstelecom.pt/rede-e-cobertura/mapa-de-rede/) | claims 153 municipalities (2025) | Aggregate; API lists 154 names |
| [RNG Norte](https://norte.dstelecom.pt/rede/ambito/) | 44 municipalities | Confirmed (subset of the map) |
| [RNG Alentejo e Algarve](https://alentejoealgarve.dstelecom.pt/rede/ambito/) | 35 municipalities | Confirmed (subset of the map) |
| VagaCerta demo | 4 municipalities outside the public map | **Inferred / demo-seed** |
| White zones 2025 | 288 municipalities (contracts) | Out of scope for this active coverage list |

Each covered municipality in `data/zonas/municipios-caop.json` has `fonteCobertura` and `estadoCobertura` (`confirmado` or `demo`).

**Catalogued with coverage:** **158** municipalities (= 154 API + 4 demo-seed) under `data/zonas/`.

### Inferred (demo-seed, not in `concelhos_a`)

Aveiro, Barcelos, Oliveira de Azeméis, Viseu — kept for demo stories; marked `fonteCobertura: demo-seed-vagacerta` / `estadoCobertura: demo`.

### Unconfirmed on the public map (no coverage in this base)

120 CAOP municipalities with no active coverage (not in `concelhos_a` and not demo-seed):

Aguiar da Beira, Alcochete, Alenquer, Almada, Almeida, Almeirim, Alpiarça, Alvaiázere, Amadora, Ansião, Arganil, Arraiolos, Arruda dos Vinhos, Barreiro, Batalha, Beja, Benavente, Bombarral, Campo Maior, Carregal do Sal, Cartaxo, Cascais, Castanheira de Pêra, Castro Daire, Constância, Elvas, Entroncamento, Espinho, Estarreja, Estremoz, Faro, Felgueiras, Figueira de Castelo Rodrigo, Figueiró dos Vinhos, Fornos de Algodres, Góis, Idanha-a-Nova, Lagoa, Lisboa, Loures, Lourinhã, Lousã, Mafra, Maia, Manteigas, Marinha Grande, Matosinhos, Mação, Mealhada, Mira, Miranda do Corvo, Moita, Montijo, Mortágua, Murtosa, Mêda, Nazaré, Nelas, Odivelas, Oeiras, Oleiros, Olhão, Oliveira do Bairro, Oliveira do Hospital, Ovar, Palmela, Pampilhosa da Serra, Paços de Ferreira, Pedrógão Grande, Penacova, Penalva do Castelo, Penamacor, Penela, Peniche, Pinhel, Portalegre, Portimão, Porto, Proença-a-Nova, Póvoa de Varzim, Sabugal, Santa Comba Dão, Santa Maria da Feira, Santo Tirso, Sardoal, Seia, Seixal, Sertã, Sesimbra, Setúbal, Sever do Vouga, Sines, Sintra, Sobral de Monte Agraço, Sátão, São Brás de Alportel, São João da Madeira, São Pedro do Sul, Torres Novas, Torres Vedras, Trancoso, Trofa, Tábua, Vagos, Valongo, Vendas Novas, Vila Franca de Xira, Vila Nova da Barquinha, Vila Nova de Famalicão, Vila Nova de Gaia, Vila Nova de Paiva, Vila Nova de Poiares, Vila Velha de Ródão, Vila de Rei, Vila do Conde, Vizela, Vouzela, Évora, Ílhavo, Óbidos.

Canonical list also in `cobertura-dstelecom.json` → `municipiosNaoConfirmadosNoMapa` (includes the 4 demo-seed names; those still have coverage via demo).

## Seed

7 demo teams (all serve 3 operators) + 193 deterministic extras on connected sets of the 158 active municipalities = **200 teams** (~60% serve 3, ~20% serve 2, ~20% serve 1).

## Legacy databases (`zn-*` zones)

There is no automatic migration from a pre-municipality `vagacerta.sqlite`. If zones still use `zn-*` ids, startup refuses and asks you to run:

```bash
npm run demo:reset
```

That deletes the local SQLite file; the next boot reseeds DICOFRE zones and 200 teams.
