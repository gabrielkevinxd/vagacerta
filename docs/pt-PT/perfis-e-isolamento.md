# Perfis e isolamento

| Papel | Âmbito |
| --- | --- |
| Administrador e supervisor (central) | Tudo: ordens, equipas, margem, faltas, trocas, gémeo, integração |
| Despachante Azul / Vermelho / Verde | Lista, ficha e marcação só do seu operador |
| Técnico (Rui Salgado, Equipa Minho) | Só a sua equipa, com cliente e morada; estados `agendada → em_curso → concluída` |

Um despachante, na agenda e no plano, vê o trabalho dos outros como bloco `vista: "ocupada"` (início, fim, duração). Um `GET` de uma ordem alheia responde **404**, para não confirmar que existe. Não pede falta de uma equipa nem troca entre equipas.

O técnico não cria ordens nem reorganiza o dia. A central é quem corre o gémeo e confirma planos com troca.
