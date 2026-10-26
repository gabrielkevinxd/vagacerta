# Data model

SQLite at `data/vagacerta.sqlite`. Schema and seed live in `src/server/db.ts`.

Domain tables: `operadores`, `utilizadores`, `sessoes`, `regioes`, `zonas`, `ccos`, `equipas`, `equipa_zona` (validity), `tecnicos`, `competencias`, `horarios`, `indisponibilidades`, `ordens` (unique per `operador_id` + `referencia`), `historico_ordens`, `definicoes`, `auditoria`.

Order states: `pendente`, `agendada`, `em_curso`, `concluida`, `cancelada`, `em_espera`. Capacity is taken by `agendada`, `em_curso`, `concluida`.

Integration: `ofsc_recursos` (`resourceId` per operator and team), `ofsc_atividades`, `ofsc_ausencias`, `ofsc_saude`, `integracao_eventos`, `integracao_retries`, `integracao_logs`.

Injected twin: `lotes_simulacao`, `lote_recusas`, and `lote_id` on `ordens`, `ofsc_atividades`, `ofsc_ausencias`, `indisponibilidades`.

Demo passwords are stored with scrypt, never in the clear.
