# Modelo de dados

SQLite em `data/vagacerta.sqlite`. Esquema e semente em `src/server/db.ts`.

Tabelas de domínio: `operadores`, `utilizadores`, `sessoes`, `regioes`, `zonas`, `ccos`, `equipas`, `equipa_zona` (vigência), `tecnicos`, `competencias`, `horarios`, `indisponibilidades`, `ordens` (única por `operador_id` + `referencia`), `historico_ordens`, `definicoes`, `auditoria`.

Estados da ordem: `pendente`, `agendada`, `em_curso`, `concluida`, `cancelada`, `em_espera`. Ocupam capacidade: `agendada`, `em_curso`, `concluida`.

Integração: `ofsc_recursos` (`resourceId` por operador e equipa), `ofsc_atividades`, `ofsc_ausencias`, `ofsc_saude`, `integracao_eventos`, `integracao_retries`, `integracao_logs`.

Gémeo injetado: `lotes_simulacao`, `lote_recusas`, coluna `lote_id` em `ordens`, `ofsc_atividades`, `ofsc_ausencias`, `indisponibilidades`.

As palavras-passe de demonstração estão com scrypt. Não ficam em claro.
