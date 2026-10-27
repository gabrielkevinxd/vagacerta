# Zonas = municípios e frota de 200 equipas

## Modelo

- **Zona** = município (código DICOFRE CAOP2025).
- **Área** da ordem/equipa = nome oficial do município.
- Cada equipa tem `areas` (conjunto conexo na adjacência CAOP, excepto as 7 de demonstração históricas) e `operadoresServidos` (1–3; omissão = Azul+Vermelho+Verde).
- Entre operadores servidos, a reserva do intervalo é **FCFS atómica** (`BEGIN IMMEDIATE`); o segundo perde com 409 e alternativa.

## Fontes de cobertura

| Fonte | Conteúdo | Estado |
|-------|----------|--------|
| [Mapa de rede API](https://www.dstelecom.pt/wp-json/mapa-rede/v1/concelhos) (`concelhos_a`) | 154 concelhos | **Confirmado** (fonte pública completa) |
| [Mapa de rede (site)](https://www.dstelecom.pt/rede-e-cobertura/mapa-de-rede/) | afirma 153 municípios (2025) | Agregado; a API lista 154 nomes |
| [RNG Norte](https://norte.dstelecom.pt/rede/ambito/) | 44 concelhos | Confirmado (subconjunto do mapa) |
| [RNG Alentejo e Algarve](https://alentejoealgarve.dstelecom.pt/rede/ambito/) | 35 concelhos | Confirmado (subconjunto do mapa) |
| Demo VagaCerta | 4 municípios fora do mapa público | **Inferido / demo-seed** |
| Zonas brancas 2025 | 288 concelhos (contratos) | Fora do âmbito desta lista de cobertura activa |

Cada município em `data/zonas/municipios-caop.json` com cobertura tem `fonteCobertura` e `estadoCobertura` (`confirmado` ou `demo`).

**Total catalogado com cobertura:** **158** municípios (= 154 API + 4 demo-seed).  
Ficheiros: `data/zonas/municipios-caop.json`, `data/zonas/cobertura-dstelecom.json`.

### Inferidos (demo-seed, não estão em `concelhos_a`)

Aveiro, Barcelos, Oliveira de Azeméis, Viseu — mantidos para as histórias de demonstração; marcados com `fonteCobertura: demo-seed-vagacerta` / `estadoCobertura: demo`.

### Não confirmados no mapa público (sem cobertura nesta base)

120 municípios CAOP presentes no catálogo sem cobertura activa (não estão em `concelhos_a` nem no demo-seed):

Aguiar da Beira, Alcochete, Alenquer, Almada, Almeida, Almeirim, Alpiarça, Alvaiázere, Amadora, Ansião, Arganil, Arraiolos, Arruda dos Vinhos, Barreiro, Batalha, Beja, Benavente, Bombarral, Campo Maior, Carregal do Sal, Cartaxo, Cascais, Castanheira de Pêra, Castro Daire, Constância, Elvas, Entroncamento, Espinho, Estarreja, Estremoz, Faro, Felgueiras, Figueira de Castelo Rodrigo, Figueiró dos Vinhos, Fornos de Algodres, Góis, Idanha-a-Nova, Lagoa, Lisboa, Loures, Lourinhã, Lousã, Mafra, Maia, Manteigas, Marinha Grande, Matosinhos, Mação, Mealhada, Mira, Miranda do Corvo, Moita, Montijo, Mortágua, Murtosa, Mêda, Nazaré, Nelas, Odivelas, Oeiras, Oleiros, Olhão, Oliveira do Bairro, Oliveira do Hospital, Ovar, Palmela, Pampilhosa da Serra, Paços de Ferreira, Pedrógão Grande, Penacova, Penalva do Castelo, Penamacor, Penela, Peniche, Pinhel, Portalegre, Portimão, Porto, Proença-a-Nova, Póvoa de Varzim, Sabugal, Santa Comba Dão, Santa Maria da Feira, Santo Tirso, Sardoal, Seia, Seixal, Sertã, Sesimbra, Setúbal, Sever do Vouga, Sines, Sintra, Sobral de Monte Agraço, Sátão, São Brás de Alportel, São João da Madeira, São Pedro do Sul, Torres Novas, Torres Vedras, Trancoso, Trofa, Tábua, Vagos, Valongo, Vendas Novas, Vila Franca de Xira, Vila Nova da Barquinha, Vila Nova de Famalicão, Vila Nova de Gaia, Vila Nova de Paiva, Vila Nova de Poiares, Vila Velha de Ródão, Vila de Rei, Vila do Conde, Vizela, Vouzela, Évora, Ílhavo, Óbidos.

Lista canónica também em `cobertura-dstelecom.json` → `municipiosNaoConfirmadosNoMapa` (inclui os 4 demo-seed acima; estes têm cobertura via demo).

## Adjacência

Derivada de polígonos CAOP2025 (DGT), simplificados (`maxAllowableOffset=0.002°`), método shapely touches/intersects. Ficheiro: `data/zonas/adjacencia.json`.

## Semente

- 7 equipas de demonstração (servem os 3 operadores; cenários inalterados).
- +193 equipas geradas de forma determinística (`src/lib/zonas/frota-seed.ts`, semente `20261027`) sobre conjuntos conexos dos 158 municípios activos: maioria serve 3; índices 0–5 do ciclo de 10 servem 1 ou 2.
- Total: **200 equipas**.
