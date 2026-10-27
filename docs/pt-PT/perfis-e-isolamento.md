# Perfis e isolamento

| Papel | Âmbito |
| --- | --- |
| Administrador e supervisor (central) | Tudo: ordens, equipas, margem, faltas, trocas, gémeo, integração OFSC (`/integracao`, `/api/integracao/*`: só a central) |
| Despachante Azul / Vermelho / Verde | Lista, ficha e marcação só do seu operador |
| Técnico (Rui Salgado, Equipa Minho) | Só a sua equipa, com cliente e morada; estados `agendada → em_curso → concluída` |

Um despachante, na agenda e no plano, vê o trabalho dos outros como bloco `vista: "ocupada"` (início, fim, duração). Um `GET` de uma ordem alheia responde **404**, para não confirmar que existe. Não pede falta de uma equipa nem troca entre equipas.

O técnico não cria ordens nem reorganiza o dia. A central é quem corre o gémeo e confirma planos com troca.

As páginas seguem a mesma regra: `/ordens/:id` e `/equipas/:id` que o ator não pode ler dão a página «não encontrada» no idioma escolhido, com estado HTTP **404** (igual para «alheia» e «inexistente»). `/integracao` e `/api/integracao/*` dão **403** a um despachante ou a um técnico, e **401** sem sessão. O webhook OFSC e o OFSC simulado aceitam ainda o segredo da integração (ver [integração OFSC](integracao-ofsc.md)).
