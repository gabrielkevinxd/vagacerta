# Motor e quotas

## Motor (`src/lib/rules`)

A **janela** é o intervalo em que o trabalho **pode começar**. A ocupação pode terminar depois do fim da janela. A margem de deslocação (15 min na demonstração) fica **entre** trabalhos, não antes do primeiro. Para uma sequência fixa, o início mais cedo é ótimo. Uma janela é opcional quando a folga de início é de 15 minutos ou menos.

`resolverSequencia` / `diaAceita` decidem se um conjunto de visitas cabe no turno, com horários, vigências de zona e indisponibilidades. O Verde exige tecnologia. Desligamento só existe nos alarmes do Verde.

O reencaixe tenta passar uma visita já marcada para a outra equipa da área quando o dia não fecha.

## Quotas OFSC

Por técnico e por dia: **3 instalações** ou **8 manutenções** (`1 instalação ≡ 8/3 manutenções`). Tipo `adicional` também entra no orçamento de unidades. A grelha em `/integracao` mostra o contador **N → N-1**.

Motivos de recusa: `Capacidade Esgotada`, `Zona Fechada`, `Fora da janela`, `Técnico indisponível`.
